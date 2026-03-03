import { db } from './firebase-config.js';
import { 
    collection, query, where, getDocs, orderBy, doc, 
    addDoc, runTransaction, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cart = [];
let currentSelectedSlot = null;

// --- 1. 獲取可用時段 (強制校準至波士頓當地時間) ---
async function getNextAvailableSlot() {
    try {
        // 抽象化：不論你在哪，都以美國東部時間 (EST) 為基準
        const estTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        }).formatToParts(new Date());

        const hours = parseInt(estTime.find(p => p.type === 'hour').value);
        const minutes = parseInt(estTime.find(p => p.type === 'minute').value);
        const currentTimeId = hours * 100 + minutes;

        const slotsRef = collection(db, "pickup_slots");
        const q = query(slotsRef, where("is_active", "==", true), orderBy("__name__"));
        const querySnapshot = await getDocs(q);

        for (const docSnap of querySnapshot.docs) {
            const slotId = parseInt(docSnap.id);
            const data = docSnap.data();
            // 嚴謹邏輯：時段需晚於當前 EST 時間，且主廚還有產能
            if (slotId >= currentTimeId && data.current_booked < data.max_capacity) {
                currentSelectedSlot = { id: docSnap.id, ...data };
                return currentSelectedSlot;
            }
        }
        return null;
    } catch (e) {
        console.error("Timezone/Slot Error:", e);
        return null;
    }
}

// --- 2. 核心提交功能 (包含身分校驗與產能鎖定) ---
window.submitOrder = async () => {
    const custId = document.getElementById('cust-id').value.trim();
    const custPhone = document.getElementById('cust-phone').value.trim();

    // 周全防禦：基本資訊檢查
    if (!custId || !custPhone) {
        alert("Please provide your Name and Phone to secure the chef's time.");
        return;
    }

    if (cart.length === 0) return alert("Cart is empty!");
    
    const slot = await getNextAvailableSlot(); // 再次確認時段有效性
    if (!slot) return alert("Chef is at full capacity. Please check back later.");

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerText = "Securing Capacity...";

    try {
        await runTransaction(db, async (transaction) => {
            const slotRef = doc(db, "pickup_slots", slot.id);
            const slotSnap = await transaction.get(slotRef);
            
            if (slotSnap.data().current_booked >= slotSnap.data().max_capacity) {
                throw "Chef's slot just filled up!";
            }

            const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

            const orderData = {
                customer: { name: custId, phone: custPhone },
                items: cart,
                billing: {
                    standard_total: subtotal,
                    harvard_total: subtotal * 0.9
                },
                pickup_info: {
                    slot_id: slot.id,
                    time_label: slot.time_label
                },
                created_at: serverTimestamp(),
                status: "confirmed"
            };

            transaction.update(slotRef, { current_booked: slotSnap.data().current_booked + 1 });
            await addDoc(collection(db, "orders"), orderData);
        });

        alert(`Order confirmed! Chef is preparing your meal for ${slot.time_label}.`);
        cart = [];
        window.location.reload();
    } catch (e) {
        alert("Submission Error: " + e);
        btn.disabled = false;
        btn.innerText = "PLACE MY ORDER";
    }
};

// --- 3. 渲染摘要 (UI 顯示邏輯) ---
async function renderSummary() {
    const summarySection = document.getElementById('group-order-summary');
    const summaryText = document.getElementById('summary-text');
    if (cart.length === 0) { summarySection.style.display = 'none'; return; }

    summarySection.style.display = 'block';
    const slot = await getNextAvailableSlot();
    
    let subtotal = 0;
    let itemsLines = `🛒 Order Detail for ${document.getElementById('cust-id').value || 'Guest'}\n`;
    itemsLines += `====================\n`;

    cart.forEach(item => {
        const lineTotal = item.unitPrice * item.quantity;
        subtotal += lineTotal;
        itemsLines += `• ${item.name} x${item.quantity}: $${lineTotal.toFixed(2)}\n`;
    });

    itemsLines += `====================\n`;
    itemsLines += `ESTIMATED PICKUP: ${slot ? slot.time_label : 'SLOTS FULL'}\n`;
    itemsLines += `Standard Total: $${subtotal.toFixed(2)}\n`;
    itemsLines += `🎓 Harvard Price: $${(subtotal * 0.9).toFixed(2)}\n`;
    itemsLines += `====================\n`;
    itemsLines += `Medical Integrity. Chef's Precision. 🔬`;

    summaryText.innerText = itemsLines;
}

// 監聽輸入以即時反映姓名
document.getElementById('cust-id')?.addEventListener('input', renderSummary);

// --- 4. 購物車邏輯 ---
window.handleAddToCart = (itemId, itemName, price) => {
    const qtyInput = document.getElementById(`qty-${itemId}`);
    const quantity = parseInt(qtyInput.value);
    if (quantity <= 0) return;

    const existing = cart.find(i => i.id === itemId);
    if (existing) existing.quantity += quantity;
    else cart.push({ id: itemId, name: itemName, unitPrice: price, quantity });

    renderSummary();
};
