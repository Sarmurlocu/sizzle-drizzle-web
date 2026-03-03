// cart.js - 誠信與效率優化版
let cart = [];

// --- 1. 加入購物車 (嚴謹邏輯：對齊 Firebase 數據) ---
window.handleAddToCart = (itemId, itemName, price) => {
    const qtyInput = document.getElementById(`qty-${itemId}`);
    const quantity = parseInt(qtyInput.value);
    const maxStock = parseInt(qtyInput.getAttribute('max'));

    if (quantity <= 0 || isNaN(quantity)) return;
    if (quantity > maxStock) {
        alert(`Sorry, only ${maxStock} left in stock.`);
        return;
    }

    const existingItem = cart.find(item => item.id === itemId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ id: itemId, name: itemName, unitPrice: price, quantity: quantity });
    }

    renderSummary();
    
    // 按鈕回饋
    const btn = event.target;
    btn.innerText = "Added! ✓";
    setTimeout(() => { btn.innerText = "Add to Order"; }, 1000);
};

// --- 2. 渲染摘要 (透明度優化：同時顯示標準價與哈佛價) ---
function renderSummary() {
    const summarySection = document.getElementById('group-order-summary');
    const summaryText = document.getElementById('summary-text');
    
    if (cart.length === 0) {
        summarySection.style.display = 'none';
        return;
    }

    summarySection.style.display = 'block';
    let subtotal = 0;
    let itemsLines = `Sizzle & Drizzle | Official Order\n`;
    itemsLines += `==================================\n`;

    cart.forEach(item => {
        const lineTotal = item.unitPrice * item.quantity;
        subtotal += lineTotal;
        itemsLines += `• ${item.name} x${item.quantity}: $${lineTotal.toFixed(2)}\n`;
    });

    const harvardTotal = subtotal * 0.9;

    itemsLines += `==================================\n`;
    itemsLines += `STANDARD TOTAL: $${subtotal.toFixed(2)}\n`;
    itemsLines += `🎓 HARVARD PRICE: $${harvardTotal.toFixed(2)}\n`;
    itemsLines += `==================================\n`;
    itemsLines += `Note: Show Harvard ID during pickup for 10% off.\n`;
    itemsLines += `Prepared with Medical Integrity 🔬`;

    summaryText.innerText = itemsLines;
}

// --- 3. 複製功能 ---
window.copySummary = () => {
    const text = document.getElementById('summary-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Summary copied! Please paste it into your messaging app.");
    });
};
