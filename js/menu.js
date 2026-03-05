import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadMenu() {
    const container = document.getElementById('menu-container');
    if (!container) {
        console.error("Boundary Error: 找不到 #menu-container 容器");
        return;
    }

    container.innerHTML = '<p>🔬 Analyzing medical-grade ingredients...</p>';
    console.log("System: Starting to fetch menu data...");

    try {
        // 1. 執行資料獲取
        const querySnapshot = await getDocs(collection(db, "menu_items"));
        
        // 邊界檢查：檢查資料庫是否回傳內容
        if (querySnapshot.empty) {
            console.warn("System Warning: 資料庫集合 'menu_items' 是空的！");
            container.innerHTML = '<p>⚠️ No precision items found in database.</p>';
            return;
        }

        const items = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        console.log(`System: Successfully loaded ${items.length} items.`, items);

        // 2. 邏輯分類
        const categories = {
            "01. Fresh Produce": items.filter(i => i.category === "Fresh Produce"),
            "02. Chef's Special Dishes": items.filter(i => i.category === "Chef's Special Dishes")
        };

        let html = '';

        for (const [categoryName, catItems] of Object.entries(categories)) {
            if (catItems.length === 0) continue;

            html += `<h2 class="menu-section-title">${categoryName}</h2>`;
            html += `<div class="items-grid">`;

            catItems.forEach(item => {
                const nutrientsHtml = (item.nutrients || [])
                    .map(n => `<span class="nutrient-tag">${n}</span>`)
                    .join('');

                const safeId = item.id.replace(/\s+/g, '-');

                // 嚴謹的特價邏輯
                let priceHtml = '';
                const currentPrice = Number(item.price);
                const originalPrice = Number(item.originalPrice);

                if (originalPrice && originalPrice > currentPrice) {
                    priceHtml = `
                        <span class="sale-price" style="color: var(--harvard-red); font-weight: bold;">$${currentPrice.toFixed(2)}</span>
                        <span class="original-price" style="color: #94a3b8; text-decoration: line-through; font-size: 0.85rem; margin-left: 5px;">$${originalPrice.toFixed(2)}</span>
                    `;
                } else {
                    priceHtml = `<span class="regular-price" style="color: #333; font-weight: bold;">$${currentPrice.toFixed(2)}</span>`;
                }

                html += `
                    <div class="item-card">
                        <h3>${item.name}</h3>
                        <div class="nutrient-container">${nutrientsHtml}</div>
                        <div class="price-row">
                            <div class="price-display">${priceHtml}</div>
                            <span style="font-size: 0.75rem; color: #999;">Stock: ${item.stock || 0}</span>
                        </div>
                        <div class="add-to-cart-controls">
                            <input type="number" id="qty-${safeId}" value="1" min="1" max="${item.stock || 99}">
                            <button onclick="window.handleAddToCart('${item.id}', '${item.name}', ${currentPrice}, '${safeId}')">Add to Order</button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        container.innerHTML = html;
        console.log("System: Menu rendering complete.");

    } catch (error) {
        // 防禦：捕獲所有可能的異步錯誤
        console.error("Critical Error during loadMenu:", error);
        container.innerHTML = `<p style="color:red;">❌ Error loading menu: ${error.message}</p>`;
    }
}

// 執行
loadMenu();
