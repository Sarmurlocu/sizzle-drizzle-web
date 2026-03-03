import { db } from './firebase-config.js';
import { 
    collection, query, where, getDocs, orderBy, doc, 
    addDoc, runTransaction, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cart = [];

// 嚴謹邏輯：時區與時段獲取
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

// 核心修改：加入周全的防禦，防止 toFixed 崩潰
async function renderSummary() {
    const emptyMsg = document.getElementById('empty-cart-msg');
    const formContent = document.getElementById('order-form-content');
    const summaryText = document.getElementById('summary-text');
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
    const customerName = document.getElementById('cust-id')?.value || 'Guest';
    
    let itemsLines = `🛒 Order Detail for ${customerName}\n`;
    itemsLines += `============================\n`;

    cart.forEach(item => {
        // 周全的防禦：確保 unitPrice 是數字，否則給予 0
        const price = parseFloat(item.unitPrice) || 0;
        const lineTotal = price * (parseInt(item.quantity) || 0);
        subtotal += lineTotal;
        itemsLines += `• ${item.name} x${item.quantity}: $${lineTotal.toFixed(2)}\n`;
    });

    itemsLines += `============================\n`;
    itemsLines += `ESTIMATED PICKUP: ${slot ? slot.time_label : 'CHEF BUSY'}\n`;
    itemsLines += `Standard Total: $${subtotal.toFixed(2)}\n`;
    itemsLines += `🎓 Harvard Price: $${(subtotal * 0.9).toFixed(2)}\n`;
    itemsLines += `============================\n`;
    itemsLines += `Medical Integrity. Chef's Precision. 🔬`;

    summaryText.innerText = itemsLines;
}

window.handleAddToCart = (itemId, itemName, price) => {
    const qtyInput = document.getElementById(`qty-${itemId}`);
    if (!qtyInput) return;
    
    const quantity = parseInt(qtyInput.value) || 0;
    if (quantity <= 0) return;

    // 確保傳入的 price 永遠是數字 (防禦性處理)
    const validPrice = parseFloat(price) || 0;

    const existing = cart.find(i => i.id === itemId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ id: itemId, name: itemName, unitPrice: validPrice, quantity });
    }
    renderSummary();
};

window.submitOrder = async () => {
    const custId = document.getElementById('cust-id')?.value.trim();
    const custPhone = document.getElementById('cust-phone')?.value.trim();
    if (!custId || !custPhone) return alert("Please enter Name and Phone.");

    const slot = await getNextAvailableSlot();
    if (!slot) return alert("All slots full.");

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;

    try {
        await runTransaction(db, async (transaction) => {
            const slotRef = doc(db, "pickup_slots", slot.id);
            const slotSnap = await transaction.get(slotRef);
            if (slotSnap.data().current_booked >= slotSnap.data().max_capacity) throw "Full!";

            const subtotal = cart.reduce((sum, item) => sum + ((parseFloat(item.unitPrice) || 0) * item.quantity), 0);
            await addDoc(collection(db, "orders"), {
                customer: { name: custId, phone: custPhone },
                items: cart,
                billing: { standard_total: subtotal, harvard_total: subtotal * 0.9 },
                pickup_info: { slot_id: slot.id, time_label: slot.time_label },
                created_at: serverTimestamp()
            });
            transaction.update(slotRef, { current_booked: slotSnap.data().current_booked + 1 });
        });
        alert("Success!");
        location.reload();
    } catch (e) {
        alert("Error: " + e);
        btn.disabled = false;
    }
};

document.addEventListener('input', (e) => { if (e.target.id === 'cust-id') renderSummary(); });
renderSummary();
