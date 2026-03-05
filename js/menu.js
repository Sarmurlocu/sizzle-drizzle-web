import { db } from './firebase-config.js';
// ⚠️ 嚴謹邏輯：改用 collectionGroup 來跨資料夾抓取子集合
import { collectionGroup, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadMenu() {
    const container = document.getElementById('menu-container');
    if (!container) return;

    console.log("System: Starting to fetch menu data using Collection Group...");

    try {
        // 【適配器模式】：跨層級抓取所有名為 'items' 的子集合
        const querySnapshot = await getDocs(collectionGroup(db, "items"));
        
        if (querySnapshot.empty) {
            console.warn("System Warning: 找不到任何 'items' 子集合的資料！");
            container.innerHTML = '<p>⚠️ No precision items found in database.</p>';
            return;
        }

        const itemsList = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();

            // 1. 抽象化：從路徑中自動提取分類名稱 (例如將 01_fresh_produce 轉為 01. Fresh Produce)
            let rawCategory = "Uncategorized";
            if (doc.ref.parent && doc.ref.parent.parent) {
                rawCategory = doc.ref.parent.parent.id; 
            }
            const formatCat = rawCategory
                .replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase())
                .replace(/0(\d)\s/g, '0$1. ');

            // 2. 嚴謹邏輯：解析營養素 Map，只留下值為 true 的項目
            const tagsMap = data.nutrition_tags || {};
            const nutrientsArray = Object.keys(tagsMap).filter(key => tagsMap[key] === true);

            // 3. 邊界處理：計算精確的折扣價格
            const basePrice = Number(data.base_price) || 0;
            const isDiscounted = data.is_discounted === true;
            const discountRate = Number(data.discount_rate) || 1;

            let currentPrice = basePrice;
            let originalPrice = 0;

            // 如果 is_discounted 為 true，啟動特價邏輯
            if (isDiscounted) {
                currentPrice = basePrice * discountRate;
                originalPrice = basePrice;
            }

            // 4. 裝填到標準化結構中
            itemsList.push({
                id: doc.id,
                name: data.name || 'Unnamed Item',
                category: formatCat,
                price: currentPrice,
                originalPrice: originalPrice,
                stock: Number(data.stock) || 0,
                nutrients: nutrientsArray
            });
        });

        console.log(`System: Successfully adapted ${itemsList.length} items.`, itemsList);

        // 動態分組演算法
        const categories = {};
        itemsList.forEach(item => {
            if (!categories[item.category]) categories[item.category] = [];
            categories[item.category].push(item);
        });

        let html = '';
        for (const [categoryName, catItems] of Object.entries(categories)) {
            html += `<h2 class="menu-section-title">${categoryName}</h2><div class="items-grid">`;

            catItems.forEach(item => {
                const nutrientsHtml = item.nutrients.map(n => `<span class="nutrient-tag">${n}</span>`).join('');
                const safeId = item.id.replace(/\s+/g, '-');

                let priceHtml = '';
                if (item.originalPrice > item.price && item.price > 0) {
                    priceHtml = `
                        <span style="color: var(--harvard-red); font-weight: bold; font-size: 1.2rem;">$${item.price.toFixed(2)}</span>
                        <span style="color: #94a3b8; text-decoration: line-through; font-size: 0.9rem; margin-left: 5px;">$${item.originalPrice.toFixed(2)}</span>
                    `;
                } else {
                    priceHtml = `<span style="color: var(--text-main); font-weight: bold; font-size: 1.2rem;">$${item.price.toFixed(2)}</span>`;
                }

                html += `
                    <div class="item-card">
                        <h3>${item.name}</h3>
                        <div class="nutrient-container">${nutrientsHtml}</div>
                        <div class="price-row">
                            <div class="price-display">${priceHtml}</div>
                            <span style="font-size: 0.8rem; color: #888;">Stock: ${item.stock}</span>
                        </div>
                        <div class="add-to-cart-controls">
                            <input type="number" id="qty-${safeId}" value="1" min="1" max="${item.stock || 99}">
                            <button onclick="window.handleAddToCart('${item.id}', '${item.name}', ${item.price}, '${safeId}')">Add to Order</button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`; 
        }

        container.innerHTML = html;

    } catch (error) {
        console.error("Critical Error during loadMenu:", error);
        container.innerHTML = `<p style="color:red;">❌ Error loading menu: ${error.message}</p>`;
    }
}

// 執行
loadMenu();
