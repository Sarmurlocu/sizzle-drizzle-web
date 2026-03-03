// --- Optimized Rendering Logic (Defensive & Precise) ---
itemsSnapshot.forEach((itemDoc) => {
    const item = itemDoc.data();
    const itemId = itemDoc.id;
    const basePrice = item.base_price || 0;
    const safeName = item.name.replace(/'/g, "\\'");

    // 1. 嚴謹邏輯：動態解析 Firebase 的 nutrition_tags (Map)
    let tagHtml = "";
    if (item.nutrition_tags && typeof item.nutrition_tags === 'object') {
        // 僅提取值為 true 的鍵名 (Key)
        Object.entries(item.nutrition_tags).forEach(([key, value]) => {
            if (value === true) {
                // 這裡的 key 會直接顯示如 "Fiber", "Protein", "Micronutrients"
                tagHtml += `<span class="nutrition-badge">${key}</span>`;
            }
        });
    }

    // 2. 構建 HTML 結構 (確保即使沒有標籤，佈局也不會塌陷)
    const itemCard = document.createElement('div');
    itemCard.className = 'item-card';
    itemCard.innerHTML = `
        <h3 style="margin:0 0 8px 0; font-size: 1.25rem; color: #333;">${item.name}</h3>
        
        <div class="nutrition-container" style="margin-bottom: 15px; min-height: 25px; display: flex; flex-wrap: wrap; gap: 5px;">
            ${tagHtml || '<span style="color:#ccc; font-size:10px;">Natural Whole Food</span>'}
        </div>

        <p style="font-size: 1.2rem; font-weight: bold; color: #d9534f; margin: 10px 0;">
            $${basePrice.toFixed(2)}
        </p>
        
        <div style="display:flex; gap:10px; align-items:center; margin-top: 15px;">
            <div style="display:flex; align-items:center; border: 1px solid #ddd; border-radius: 6px; padding: 2px 8px;">
                <label style="font-size: 0.8rem; color: #666; margin-right: 5px;">Qty:</label>
                <input type="number" id="qty-${itemId}" value="1" min="1" 
                       style="width: 40px; border: none; outline: none; padding: 5px; font-weight: bold;">
            </div>
            <button onclick="window.handleAddToCart('${itemId}', '${safeName}', ${basePrice})" 
                    style="flex:1; background:#007bff; color:white; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; transition: 0.2s;">
                Add to Order
            </button>
        </div>
        
        <div style="margin-top: 15px; border-top: 1px dashed #eee; padding-top: 10px;">
            <a href="science.html" style="font-size: 0.8rem; color: #007bff; text-decoration: none; display: flex; align-items: center; gap: 4px;">
                <span>🔬</span> Why these nutrients matter?
            </a>
        </div>
    `;
    grid.appendChild(itemCard);
});
