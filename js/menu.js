import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. 核心轉換函數：將長字串拆解為美化標籤 ---
// 計算機思維：自動化處理資料模式 (Pattern Recognition)
function formatNutrients(nutrientString) {
    if (!nutrientString) return "";
    
    // 正則表達式：在大寫字母前切開。例如 "FiberStarch" -> ["Fiber", "Starch"]
    // 這樣你在 Firebase 後台輸入不需要加空格，前端會自動處理
    const parts = nutrientString.split(/(?=[A-Z])/);
    
    return parts.map(tag => `
        <span class="nutrient-tag">
            ${tag}
        </span>
    `).join('');
}

// --- 2. 獲取並渲染菜單 ---
async function fetchMenu() {
    const menuContainer = document.getElementById('menu-container');
    
    try {
        const q = query(collection(db, "menu"), orderBy("category_id", "asc"));
        const querySnapshot = await getDocs(q);
        
        // 按照類別分組 (例如 01. Fresh Produce, 02. Chef's Specials)
        const categories = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const catName = data.category_name || "General";
            if (!categories[catName]) categories[catName] = [];
            categories[catName].push({ id: doc.id, ...data });
        });

        menuContainer.innerHTML = '';

        for (const [catName, items] of Object.entries(categories)) {
            const section = document.createElement('section');
            section.className = 'menu-category';
            section.innerHTML = `<h2 class="menu-section-title">${catName}</h2>`;
            
            const grid = document.createElement('div');
            grid.className = 'items-grid';

            items.forEach(item => {
                const isDiscounted = item.is_discounted;
                const finalPrice = isDiscounted ? item.discount_price : item.price;
                
                // 調用轉換函數
                const nutrientHTML = formatNutrients(item.nutrients);

                const card = `
                    <div class="item-card ${item.stock <= 0 ? 'out-of-stock' : ''}">
                        <div>
                            <h3>${item.name}</h3>
                            
                            <div class="nutrient-container">
                                ${nutrientHTML}
                            </div>
                            
                            <div class="price-row">
                                <span class="current-price">$${finalPrice.toFixed(2)}</span>
                                ${isDiscounted ? `<span class="old-price">$${item.price.toFixed(2)}</span>` : ''}
                            </div>
                            
                            <p style="font-size: 0.75rem; color: #888; margin-bottom: 10px;">
                                In Stock: ${item.stock}
                            </p>
                        </div>

                        <div style="margin-top: auto;">
                            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
                                <input type="number" id="qty-${item.id}" value="1" min="1" max="${item.stock}" 
                                       style="width: 45px; padding: 6px; border-radius: 6px; border: 1px solid #ddd; text-align: center;">
                                <button class="add-btn" onclick="handleAddToCart('${item.id}', '${item.name}', ${finalPrice})">
                                    ADD TO ORDER
                                </button>
                            </div>
                            
                            <a href="science.html" style="font-size: 11px; color: var(--medical-blue); text-decoration: none; font-weight: 600;">
                                🔬 Bio-Nutrient Analysis
                            </a>
                        </div>
                    </div>
                `;
                grid.innerHTML += card;
            });

            section.appendChild(grid);
            menuContainer.appendChild(section);
        }

    } catch (error) {
        console.error("Menu Load Error:", error);
        menuContainer.innerHTML = `<p style="color:red; text-align:center;">Kitchen Sync Error. Please refresh.</p>`;
    }
}

fetchMenu();
