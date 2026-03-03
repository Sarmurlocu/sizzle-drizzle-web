// cart.js - 核心購物邏輯與誠信演算
let cart = [];
let globalDiscount = 1.0; // 預設無額外折扣

// --- 1. 哈佛信箱折扣驗證 (演算法優化) ---
window.applyDiscount = () => {
    const emailInput = document.getElementById('user-email').value.trim();
    const domain = emailInput.split('@')[1];

    if (domain === 'harvard.edu') {
        globalDiscount = 0.9; // 9折優惠
        alert("✅ Harvard Verification Successful! 10% discount applied to your total.");
    } else {
        globalDiscount = 1.0;
        alert("ℹ️ Standard pricing applied. Use a @harvard.edu email for affiliate discounts.");
    }
    renderSummary(); // 重新渲染，確保價格即時更新
};

// --- 2. 加入購物車 (周全防禦：確保價格與數量合法) ---
window.handleAddToCart = (itemId, itemName, price) => {
    const qtyInput = document.getElementById(`qty-${itemId}`);
    const quantity = parseInt(qtyInput.value);
    const maxStock = parseInt(qtyInput.getAttribute('max'));

    // 邊界檢查：確保數量大於0且不超過庫存
    if (quantity <= 0 || isNaN(quantity)) {
        alert("Please enter a valid quantity.");
        return;
    }
    if (quantity > maxStock) {
        alert(`❌ Error: Only ${maxStock} units left in stock.`);
        return;
    }

    // 嚴謹邏輯：檢查購物車是否已有此品項
    const existingItem = cart.find(item => item.id === itemId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: itemId,
            name: itemName,
            unitPrice: price, // 這裡傳入的是 Firebase 判斷後的折扣價
            quantity: quantity
        });
    }

    renderSummary();
    
    // 視覺回饋
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Added! ✓";
    btn.style.background = "#28a745";
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = "#007bff";
    }, 1000);
};

// --- 3. 渲染訂單摘要 (誠信展示：列出明細與最終折扣) ---
function renderSummary() {
    const summarySection = document.getElementById('group-order-summary');
    const summaryText = document.getElementById('summary-text');
    
    if (cart.length === 0) {
        summarySection.style.display = 'none';
        return;
    }

    summarySection.style.display = 'block';
    
    let rawTotal = 0;
    let itemsHtml = `Sizzle & Drizzle Order Summary\n`;
    itemsHtml += `----------------------------------\n`;

    cart.forEach(item => {
        const itemTotal = item.unitPrice * item.quantity;
        rawTotal += itemTotal;
        itemsHtml += `• ${item.name} x${item.quantity}: $${itemTotal.toFixed(2)}\n`;
    });

    const finalTotal = rawTotal * globalDiscount;
    const discountAmount = rawTotal - finalTotal;

    itemsHtml += `----------------------------------\n`;
    itemsHtml += `Subtotal: $${rawTotal.toFixed(2)}\n`;
    
    if (globalDiscount < 1.0) {
        itemsHtml += `Affiliate Discount (10%): -$${discountAmount.toFixed(2)}\n`;
    }
    
    itemsHtml += `TOTAL PAYABLE: $${finalTotal.toFixed(2)}\n`;
    itemsHtml += `----------------------------------\n`;
    itemsHtml += `Prepared with Medical Precision 🔬`;

    summaryText.innerText = itemsHtml;
}

// --- 4. 複製摘要 (方便 WhatsApp/Slack 點餐) ---
window.copySummary = () => {
    const text = document.getElementById('summary-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Order summary copied to clipboard! You can now paste it to your group chat.");
    });
};
