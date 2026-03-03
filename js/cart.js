import { db } from './firebase-config.js';
import { 
    collection, query, where, getDocs, orderBy, doc, 
    addDoc, updateDoc, runTransaction, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cart = [];
let currentSelectedSlot = null; // 追蹤當前分配的時段

// --- 1. 獲取可用時段 ---
async function getNextAvailableSlot() {
    try {
        const now = new Date();
        const currentTimeId = now.getHours() * 100 + now.getMinutes();
        const slotsRef = collection(db, "pickup_slots");
        const q = query(slotsRef, where("is_active", "==", true), orderBy("__name__"));
        const querySnapshot = await getDocs(q);

        for (const docSnap of querySnapshot.docs) {
            const slotId = parseInt(docSnap.id);
            const data = docSnap.data();
            if (slotId >= currentTimeId && data.current_booked < data.max_capacity) {
                currentSelectedSlot = { id: docSnap.id, ...data };
                return currentSelectedSlot;
            }
        }
        return null;
    } catch (e) { console.error("Slot Error:", e); return null; }
}

// --- 2. 核心提交功能 (真正寫入 Firebase) ---
window.submitOrder = async () => {
    if (cart.length === 0) return alert("Your cart is empty!");
    if (!currentSelectedSlot) return alert("No pickup slots available.");

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        // 使用事務 (Transaction) 確保數據一致性：防禦多人併發下單
        await runTransaction(db, async (transaction) => {
            // A. 更新取餐時段計數
            const slotRef = doc(db, "pickup_slots", currentSelectedSlot.id);
            const slotSnap = await transaction.get(slotRef);
            if (slotSnap.data().current_booked >= slotSnap.data().max_capacity) {
                throw "This slot just filled up! Please refresh.";
            }
            transaction.update(slotRef, { current_booked: slotSnap.data().current_booked + 1 });

            // B. 寫入訂單資料
            const orderData = {
                items: cart,
                total_price: cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0) * 0.9,
                pickup_slot: currentSelectedSlot.id,
                pickup_time: currentSelectedSlot.time_label,
                created_at: serverTimestamp(),
                status: "pending"
            };
            const ordersRef = collection(db, "orders");
            await addDoc(ordersRef, orderData);
        });

        alert("✅ Order Placed Successfully!");
        cart = [];
        renderSummary();
        window.location.reload(); // 重新整理以更新最新庫存與時段
    } catch (e) {
        alert("Order Failed: " + e);
        btn.disabled = false;
        btn.innerText = "Place My Order";
    }
};

// --- 3. 加入購物車 ---
window.handleAddToCart = (itemId, itemName, price) => {
    const qtyInput = document.getElementById(`qty-${itemId}`);
    const quantity = parseInt(qtyInput.value);
    const maxStock = parseInt(qtyInput.getAttribute('max'));

    if (quantity <= 0 || quantity > maxStock) return alert("Invalid quantity or out of stock.");

    const existing = cart.find(i => i.id === itemId);
    if (existing) existing.quantity += quantity;
    else cart.push({ id: itemId, name: itemName, unitPrice: price, quantity });

    renderSummary();
};

// --- 4. 渲染摘要 (更新 UI 以包含提交按鈕) ---
async function renderSummary() {
    const summarySection = document.getElementById('group-order-summary');
    const summaryText = document.getElementById('summary-text');
    
    if (cart.length === 0) {
        summarySection.style.display = 'none';
        return;
    }

    summarySection.style.display = 'block';
    const slot = await getNextAvailableSlot();
    
    let subtotal = 0;
    let itemsLines = `🛒 Order Details\n====================\n`;

    cart.forEach(item => {
        const lineTotal = item.unitPrice * item.quantity;
        subtotal += lineTotal;
        itemsLines += `• ${item.name} x${item.quantity}: $${lineTotal.toFixed(2)}\n`;
    });

    itemsLines += `====================\n`;
    itemsLines += `PICKUP: ${slot ? slot.time_label : 'FULL'}\n`;
    itemsLines += `TOTAL (10% OFF): $${(subtotal * 0.9).toFixed(2)}\n`;

    summaryText.innerText = itemsLines;
}
