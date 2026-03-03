import { db } from './firebase-config.js';
import { 
    collection, query, where, getDocs, orderBy, doc, 
    addDoc, runTransaction, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cart = [];

// --- 1. 獲取可用時段 (強制校準至波士頓當地時間 EST) ---
async function getNextAvailableSlot() {
    try {
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
            if (slotId >= currentTimeId && data.current_booked < data.max_capacity) {
                return { id: docSnap.id, ...data };
            }
        }
        return null;
    } catch (e) {
        console.error("Timezone/Slot Error:", e);
        return null;
    }
}

// --- 2. 核心修改：renderSummary 函數 ---
// 嚴謹邏輯：不隱藏 Sidebar 容器，僅切換內部內容
async function renderSummary() {
    const summarySection = document.getElementById('group-order-summary');
    const emptyMsg = document.getElementById('empty-cart-msg');
    const formContent = document.getElementById('order-form-content');
    const summaryText = document.getElementById('summary-text');

    // 魯棒性確保：如果 DOM 元素不存在則跳出，防止腳本崩潰
    if (!summarySection || !summaryText) return;

    // 確保 Sidebar 始終顯示以維持佈局美觀
    summarySection.style.display = 'block';

    // 邊界處理：購物車為空時
    if (cart.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (formContent) formContent.style.display = 'none';
        return;
    }

    // 購物車有東西時
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (formContent) formContent.style.display = 'block';

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
    itemsLines += `ESTIMATED PICKUP: ${slot ? slot.time_label : 'CHEF FULL'}\n`;
    itemsLines += `Standard Total: $${subtotal.toFixed(2)}\n`;
    itemsLines += `🎓 Harvard Price: $${(subtotal * 0.9).toFixed(2)}\n`;
    itemsLines += `====================\n`;
    itemsLines += `Medical Integrity. Chef's Precision. 🔬`;

    summaryText.innerText = itemsLines;
}

// --- 3. 購物車操作函數 ---
window.handleAddToCart = (itemId, itemName, price) => {
    const qtyInput = document.getElementById(`qty-${itemId}`);
    const quantity = parseInt(qtyInput.value);
    
    if (isNaN(quantity) || quantity <= 0) return;

    const existing = cart.find(i => i.id === itemId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ id: itemId, name: itemName, unitPrice: price, quantity });
    }

    renderSummary();
};

// --- 4. 提交訂單 ---
window.submitOrder = async () => {
    const custId = document.getElementById('cust-id').value.trim();
    const custPhone = document.getElementById('cust-phone').value.trim();

    if (!custId || !custPhone) {
        alert("Please enter Name and Phone to secure your order.");
        return;
    }

    const slot = await getNextAvailableSlot();
    if (!slot) return alert("All slots are full for now.");

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        await runTransaction(db, async (transaction) => {
            const slotRef = doc(db, "pickup_slots", slot.id);
            const slotSnap = await transaction.get(slotRef);
            
            if (slotSnap.data().current_booked >= slotSnap.data().max_capacity) {
                throw "Capacity reached!";
            }

            const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

            const orderData = {
                customer: { name: custId, phone: custPhone },
                items: cart,
                billing: { standard_total: subtotal, harvard_total: subtotal * 0.9 },
                pickup_info: { slot_id: slot.id, time_label: slot.time_label },
                created_at: serverTimestamp()
            };

            transaction.update(slotRef, { current_booked: slotSnap.data().current_booked + 1 });
            await addDoc(collection(db, "orders"), orderData);
        });

        alert("Order Successful!");
        cart = [];
        window.location.reload();
    } catch (e) {
        alert("Error: " + e);
        btn.disabled = false;
        btn.innerText = "CONFIRM & PREPARE";
    }
};

// 監聽姓名輸入即時更新摘要
document.getElementById('cust-id')?.addEventListener('input', renderSummary);
