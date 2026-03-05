import { db } from './firebase-config.js';
import { 
    collection, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cart = [];

/**
 * 抽象化：哈佛當地時間算法
 */
function getEstimatedPickupTime() {
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    estTime.setHours(estTime.getHours() + 1);
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return estTime.toLocaleTimeString('en-US', options);
}

/**
 * 渲染摘要演算法：即時更新 ID 與 金額
 */
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
    if (formContent) formContent.style.display = 'flex'; 

    const pickupTime = getEstimatedPickupTime();
    let subtotal = 0;
    const customerID = document.getElementById('guest-id')?.value.trim() || 'Guest';
    
    let itemsLines = `🛒 Order Detail for ${customerID}\n`;
    itemsLines += `============================\n`;

    cart.forEach(item => {
        const lineTotal = (parseFloat(item.unitPrice) || 0) * item.quantity;
        subtotal += lineTotal;
        itemsLines += `• ${item.name} x${item.quantity}: $${lineTotal.toFixed(2)}\n`;
    });

    itemsLines += `============================\n`;
    itemsLines += `ESTIMATED: After ${pickupTime}\n`;
    itemsLines += `Standard Total: $${subtotal.toFixed(2)}\n`;
    itemsLines += `🎓 Harvard Price: $${(subtotal * 0.9).toFixed(2)}\n`;
    itemsLines += `============================\n`;
    itemsLines += `Medical Integrity. Chef's Precision. 🔬`;

    summaryText.textContent = itemsLines;
}

/**
 * 加入購物車邏輯
 */
window.handleAddToCart = (itemId, itemName, price, safeId) => {
    const targetId = safeId || itemId;
    const qtyInput = document.getElementById(`qty-${targetId}`);
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

/**
 * 下單邏輯：Firebase 異步防禦性編程
 */
window.submitOrder = async () => {
    const idField = document.getElementById('guest-id');
    const phoneField = document.getElementById('guest-phone');
    const guestId = idField?.value.trim();
    const guestPhone = phoneField?.value.trim();
    
    if (!guestId || !guestPhone) {
        alert("Boundary Check: Please enter Name and Phone.");
        return;
    }

    const btn = document.querySelector('.place-order-btn'); 
    btn.disabled = true;
    btn.textContent = "PROCESSING...";

    try {
        const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        
        await addDoc(collection(db, "orders"), {
            customer: { id: guestId, phone: guestPhone },
            items: cart,
            billing: { total: subtotal * 0.9 },
            status: "pending",
            created_at: serverTimestamp()
        });

        alert("Order Received!");
        // 清理狀態
        cart = [];
        idField.value = '';
        phoneField.value = '';
        renderSummary();
    } catch (e) {
        alert("Logic Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "PLACE ORDER";
    }
};

// 監聽 ID 即時輸入同步
document.addEventListener('input', (e) => {
    if (e.target.id === 'guest-id') renderSummary();
});

renderSummary();
