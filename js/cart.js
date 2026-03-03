import { db } from './firebase-config.js';
import { 
    collection, query, where, getDocs, orderBy, doc, 
    addDoc, runTransaction, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cart = [];

async function getNextAvailableSlot() {
    try {
        const estTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false
        }).formatToParts(new Date());
        const hours = parseInt(estTime.find(p => p.type === 'hour').value);
        const minutes = parseInt(estTime.find(p => p.type === 'minute').value);
        const currentTimeId = hours * 100 + minutes;

        const slotsRef = collection(db, "pickup_slots");
        const q = query(slotsRef, where("is_active", "==", true), orderBy("__name__"));
        const querySnapshot = await getDocs(q);

        for (const docSnap of querySnapshot.docs) {
            if (parseInt(docSnap.id) >= currentTimeId && docSnap.data().current_booked < docSnap.data().max_capacity) {
                return { id: docSnap.id, ...docSnap.data() };
            }
        }
        return null;
    } catch (e) { return null; }
}

async function renderSummary() {
    const summaryText = document.getElementById('summary-text');
    const formContent = document.getElementById('order-form-content');
    const emptyMsg = document.getElementById('empty-cart-msg');
    if (!summaryText) return;

    if (cart.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (formContent) formContent.style.display = 'none';
        return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    if (formContent) formContent.style.display = 'block';

    const slot = await getNextAvailableSlot();
    let subtotal = 0;
    let itemsLines = `🛒 Order Detail\n============================\n`;

    cart.forEach(item => {
        const lineTotal = (parseFloat(item.unitPrice) || 0) * item.quantity;
        subtotal += lineTotal;
        itemsLines += `• ${item.name} x${item.quantity}: $${lineTotal.toFixed(2)}\n`;
    });

    itemsLines += `============================\n`;
    itemsLines += `PICKUP: ${slot ? slot.time_label : 'BUSY'}\n`;
    itemsLines += `Standard: $${subtotal.toFixed(2)}\n`;
    itemsLines += `🎓 Harvard: $${(subtotal * 0.9).toFixed(2)}\n`;
    summaryText.innerText = itemsLines;
}

// 修正後的 AddToCart：使用傳入的 safeId 來定位 DOM 元素
window.handleAddToCart = (itemId, itemName, price, safeId) => {
    const qtyInput = document.getElementById(`qty-${safeId}`);
    if (!qtyInput) return;
    
    const quantity = parseInt(qtyInput.value) || 0;
    if (quantity <= 0) return;

    const existing = cart.find(i => i.id === itemId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ id: itemId, name: itemName, unitPrice: parseFloat(price) || 0, quantity });
    }
    renderSummary();
};

window.submitOrder = async () => {
    const custId = document.getElementById('cust-id')?.value.trim();
    const custPhone = document.getElementById('cust-phone')?.value.trim();
    if (!custId || !custPhone) return alert("Please enter identification.");

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;

    try {
        const slot = await getNextAvailableSlot();
        if (!slot) throw "Slots are full.";

        await addDoc(collection(db, "orders"), {
            customer: { name: custId, phone: custPhone },
            items: cart,
            created_at: serverTimestamp()
        });
        alert("Order Success!");
        location.reload();
    } catch (e) {
        alert(e);
        btn.disabled = false;
    }
};

renderSummary();
