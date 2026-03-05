import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cart = [];

// 抽象化：時間演算法
function getEstimatedPickupTime() {
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    estTime.setHours(estTime.getHours() + 1);
    return estTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// 渲染邏輯：嚴格顯示/隱藏控制
function renderSummary() {
    const emptyMsg = document.getElementById('empty-cart-msg');
    const formContent = document.getElementById('order-form-content');
    const summaryText = document.getElementById('summary-text');
    
    if (!emptyMsg || !formContent) return; // 魯棒性檢查

    if (cart.length === 0) {
        emptyMsg.style.display = 'block';
        formContent.style.display = 'none';
        return;
    }

    emptyMsg.style.display = 'none';
    formContent.style.display = 'block'; 

    const guestId = document.getElementById('guest-id')?.value.trim() || 'Guest';
    let subtotal = 0;
    let lines = `🛒 Order for ${guestId}\n`;
    lines += `----------------------------\n`;

    cart.forEach(item => {
        const itemTotal = item.unitPrice * item.quantity;
        subtotal += itemTotal;
        lines += `• ${item.name} x${item.quantity}: $${itemTotal.toFixed(2)}\n`;
    });

    lines += `----------------------------\n`;
    lines += `ESTIMATED: After ${getEstimatedPickupTime()}\n`;
    lines += `Standard Total: $${subtotal.toFixed(2)}\n`;
    lines += `🎓 Harvard Discount: $${(subtotal * 0.9).toFixed(2)}\n`;
    lines += `----------------------------\n`;
    lines += `Status: Medical-Grade Precision`;

    if (summaryText) summaryText.textContent = lines;
}

// 全域掛載：下單邏輯
window.submitOrder = async () => {
    const idField = document.getElementById('guest-id');
    const phoneField = document.getElementById('guest-phone');
    
    if (!idField?.value.trim() || !phoneField?.value.trim()) {
        alert("Boundary Error: ID and Phone are required.");
        return;
    }

    const btn = document.querySelector('.place-order-btn');
    btn.disabled = true;
    btn.textContent = "SENDING...";

    try {
        await addDoc(collection(db, "orders"), {
            customer: { id: idField.value, phone: phoneField.value },
            items: cart,
            created_at: serverTimestamp(),
            status: "pending"
        });
        alert("Order Received! See you in 1 hour.");
        cart = [];
        idField.value = '';
        phoneField.value = '';
        renderSummary();
    } catch (e) {
        alert("Logic Failure: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "PLACE ORDER";
    }
};

// 全域掛載：加入購物車
window.handleAddToCart = (id, name, price, safeId) => {
    const qtyInput = document.getElementById(`qty-${safeId || id}`);
    const qty = parseInt(qtyInput?.value) || 0;
    if (qty <= 0) return;

    const existing = cart.find(i => i.id === id);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ id, name, unitPrice: parseFloat(price), quantity: qty });
    }
    renderSummary();
};

// 監聽輸入即時更新摘要
document.addEventListener('input', (e) => {
    if (e.target.id === 'guest-id') renderSummary();
});

// 初始化
renderSummary();
