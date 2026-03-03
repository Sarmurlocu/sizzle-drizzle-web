// cart.js - Optimized for American User Context

function renderSummary() {
    const summarySection = document.getElementById('group-order-summary');
    const summaryText = document.getElementById('summary-text');
    
    if (cart.length === 0) {
        summarySection.style.display = 'none';
        return;
    }

    summarySection.style.display = 'block';
    let subtotal = 0;
    
    // --- Natural American English Alignment ---
    let itemsLines = `🛒 Sizzle & Drizzle | Your Order Details\n`;
    itemsLines += `==================================\n`;

    cart.forEach(item => {
        const lineTotal = item.unitPrice * item.quantity;
        subtotal += lineTotal;
        itemsLines += `• ${item.name} x${item.quantity}  >>  $${lineTotal.toFixed(2)}\n`;
    });

    const harvardTotal = subtotal * 0.9;

    itemsLines += `==================================\n`;
    itemsLines += `SUBTOTAL: $${subtotal.toFixed(2)}\n`;
    itemsLines += `🎓 CAMPUS PRICE (10% OFF): $${harvardTotal.toFixed(2)}\n`;
    itemsLines += `==================================\n`;
    itemsLines += `NOTE: Please present Harvard/Campus ID at pickup.\n`;
    itemsLines += `Medical Precision. Culinary Excellence. 🔬`;

    summaryText.innerText = itemsLines;
}

window.copySummary = () => {
    const text = document.getElementById('summary-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("✅ Order details copied!\nPaste this into your Group Chat or Messaging App.");
    });
};
