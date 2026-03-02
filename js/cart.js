// 抽象化：使用物件結構管理購物車，方便統計數量
let cart = {};
let discountRate = 1.0;

// 1. 處理折扣邏輯 (周全防禦：檢查 Email 格式)
window.applyDiscount = () => {
    const email = document.getElementById('user-email').value;
    if (email.endsWith('@harvard.edu')) {
        discountRate = 0.9;
        alert("Success! 10% discount applied to your order.");
        updateSummary(); // 重新計算已選購物品的價格
    } else {
        alert("Please enter a valid Harvard email address.");
    }
};

// 2. 處理點餐邏輯 (演算法優化：支持批量輸入)
window.handleAddToCart = (itemId, name, basePrice) => {
    const qtyInput = document.getElementById(`qty-${itemId}`);
    const quantity = parseInt(qtyInput.value) || 0;

    if (quantity <= 0) {
        alert("Please enter a valid quantity.");
        return;
    }

    // 嚴謹邏輯：如果已存在則累加，不存在則新增
    if (cart[itemId]) {
        cart[itemId].quantity += quantity;
    } else {
        cart[itemId] = {
            name: name,
            price: basePrice,
            quantity: quantity
        };
    }

    qtyInput.value = 1; // 重置輸入框
    updateSummary();
};

// 3. 更新摘要顯示 (明確範圍：只更新 summary 區域)
function updateSummary() {
    const summarySection = document.getElementById('group-order-summary');
    const summaryText = document.getElementById('summary-text');
    
    const items = Object.keys(cart);
    if (items.length === 0) {
        summarySection.style.display = 'none';
        return;
    }

    summarySection.style.display = 'block';
    let text = "📋 --- Sizzle & Drizzle Order ---\n\n";
    let total = 0;

    items.forEach(id => {
        const item = cart[id];
        const finalPrice = item.price * discountRate;
        const subtotal = finalPrice * item.quantity;
        total += subtotal;
        text += `${item.name} x ${item.quantity} = $${subtotal.toFixed(2)}\n`;
    });

    text += `\n--------------------------\n`;
    text += `Total Amount: $${total.toFixed(2)}`;
    summaryText.innerText = text;
}

// 4. 複製到剪貼簿 (魯棒性：處理不同瀏覽器的 API)
window.copySummary = () => {
    const summaryText = document.getElementById('summary-text').innerText;
    if (!summaryText) return;

    navigator.clipboard.writeText(summaryText).then(() => {
        alert("Order list copied to clipboard!");
    }).catch(err => {
        console.error("Copy failed", err);
    });
};
