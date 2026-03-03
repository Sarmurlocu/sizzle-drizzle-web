import { db } from './firebase-config.js';
import { 
    collection, query, where, getDocs, orderBy, doc, 
    addDoc, runTransaction, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 內部狀態儲存
let cart = [];

/**
 * 演算法：獲取下一個可用的取餐時段
 * 邏輯：檢查當前時間並對比 pickup_slots 集合中的容量
 */
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
            const data = docSnap.data();
            // 如果時段 ID 大於當前時間且還有容量
            if (parseInt(docSnap.id) >= currentTimeId && data.current_booked < data.max_capacity) {
                return { id: docSnap.id, ...data };
            }
        }
        return null;
    } catch (e) {
        console.error("Slot fetch error:", e);
        return null;
    }
}

/**
 * 渲染邏輯：更新右側訂單摘要畫面
 * 防禦處理：確保所有數值在執行 toFixed(2) 前都是有效數字
 */
async function renderSummary() {
    const emptyMsg = document.getElementById('empty-cart-msg');
    const formContent = document.getElementById('order-form-content');
    const summaryText = document.getElementById('summary-text');
    if (!summaryText) return;

    // 範圍檢查：如果購物車為空
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
        // 周全的防禦：確保價格與數量皆為數字
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const qty = parseInt(item.quantity) || 0;
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        
        itemsLines += `• ${item.name} x${qty}: $${lineTotal.toFixed(2)}\n`;
    });

    itemsLines += `============================\n`;
    itemsLines += `ESTIMATED PICKUP: ${slot ? slot.time_label : 'CHEF BUSY (Wait...)'}\n`;
    itemsLines += `Standard Total: $${subtotal.toFixed(2)}\n`;
    itemsLines += `🎓 Harvard Price: $${(subtotal * 0.9).toFixed(2)}\n`;
    itemsLines += `============================\n`;
    itemsLines += `Medical Integrity. Chef's Precision. 🔬`;

    summaryText.innerText = itemsLines;
}

/**
 * 外部介面：供按鈕呼叫的加入購物車函數
 * 掛載到 window 物件以解決 module 作用域問題
 */
window.handleAddToCart = (itemId, itemName, price) => {
    const qtyInput = document.getElementById(`qty-${itemId}`);
    if (!qtyInput) return;
    
    const quantity = parseInt(qtyInput.value) || 0;
    if (quantity <= 0) {
        alert("Please enter a valid quantity.");
        return;
    }

    // 防禦性轉換價格
    const validPrice = parseFloat(price) || 0;

    const existingIndex = cart.findIndex(i => i.id === itemId);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({ 
            id: itemId, 
            name: itemName, 
            unitPrice: validPrice, 
            quantity: quantity 
        });
    }
    
    renderSummary();
};

/**
 * 結帳邏輯：Firebase Transaction (事務) 處理
 * 確保在下單時，時段容量的更新是「原子化」的，防止超載
 */
window.submitOrder = async () => {
    const custId = document.getElementById('cust-id')?.value.trim();
    const custPhone = document.getElementById('cust-phone')?.value.trim();
    
    if (!custId || !custPhone) {
        alert("Identification required for Harvard Community pricing.");
        return;
    }

    const slot = await getNextAvailableSlot();
    if (!slot) {
        alert("I'm sorry, all pickup slots for today are currently at peak capacity.");
        return;
    }

    const btn = document.getElementById('submit-btn');
    btn.innerText = "PROCESSING...";
    btn.disabled = true;

    try {
        await runTransaction(db, async (transaction) => {
            const slotRef = doc(db, "pickup_slots", slot.id);
            const slotSnap = await transaction.get(slotRef);
            
            if (!slotSnap.exists()) throw "Slot config error.";
            if (slotSnap.data().current_booked >= slotSnap.data().max_capacity) throw "Slot filled up just now!";

            const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            
            // 寫入訂單
            await addDoc(collection(db, "orders"), {
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
                status: "preparing",
                created_at: serverTimestamp()
            });

            // 更新容量
            transaction.update(slotRef, { 
                current_booked: slotSnap.data().current_booked + 1 
            });
        });

        alert("Order received. See you at Sizzle & Drizzle!");
        cart = []; // 清空本地購物車
        location.reload(); 
    } catch (e) {
        console.error("Transaction failure:", e);
        alert("Order failed: " + e);
        btn.innerText = "PLACE ORDER";
        btn.disabled = false;
    }
};

// 監聽 ID 輸入，實現即時預覽價格
document.addEventListener('input', (e) => {
    if (e.target.id === 'cust-id') renderSummary();
});

// 初始化畫面
renderSummary();
