import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 抽象化：將 Firebase 的 Map 結構轉化為標籤
function formatNutrientsFromMap(tagsMap) {
    if (!tagsMap) return "";
    // 遍歷 Map，只顯示值為 true 的項目
    return Object.entries(tagsMap)
        .filter(([_, value]) => value === true)
        .map(([key, _]) => `<span class="nutrient-tag">${key}</span>`)
        .join('');
}

function safePrice(price) {
    const num = parseFloat(price);
    return isNaN(num) ? "0.00" : num.toFixed(2);
}

async function fetchMenu() {
    const menuContainer = document.getElementById('menu-container');
    if (!menuContainer) return;

    try {
        const categoriesSnapshot = await getDocs(collection(db, "menu"));
        menuContainer.innerHTML = ''; 

        for (const catDoc of categoriesSnapshot.docs) {
            const catData = catDoc.data();
            const itemsRef = collection(db, "menu", catDoc.id, "items");
            const itemsSnapshot = await getDocs(itemsRef);

            if (!itemsSnapshot.empty) {
                const section = document.createElement('section');
                section.innerHTML = `<h2 class="menu-section-title">${catData.display_name || catDoc.id}</h2>`;
                const grid = document.createElement('div');
                grid.className = 'items-grid';

                itemsSnapshot.forEach(itemDoc => {
                    const item = itemDoc.data();
                    
                    // --- 關鍵邏輯對齊 ---
                    // 根據你的截圖：欄位名是 base_price 而不是 price
                    const basePrice = item.base_price || 0;
                    const discountRate = item.discount_rate || 1;
                    const isDiscounted = item.is_discounted === true;
                    
                    // 計算折扣價 (邏輯優化)
                    const finalPrice = isDiscounted ? (basePrice * discountRate) : basePrice;

                    // 處理 Map 格式的營養標籤
                    const nutrientHTML = formatNutrientsFromMap(item.nutrition_tags);

                    grid.innerHTML += `
                        <div class="item-card">
                            <h3>${item.name || 'Unnamed'}</h3>
                            <div class="nutrient-container">${nutrientHTML}</div>
                            <div class="price-row" style="margin: 10px 0; font-weight: 800;">
                                ${isDiscounted ? 
                                    `<span style="color:#e63946;">$${safePrice(finalPrice)}</span> 
                                     <span style="text-decoration:line-through; color:#999; font-size:0.8rem; margin-left:5px;">$${safePrice(basePrice)}</span>` : 
                                    `<span>$${safePrice(basePrice)}</span>`
                                }
                            </div>
                            <p style="font-size: 0.7rem; color: #888;">Stock: ${item.stock || 0}</p>
                            <div style="display: flex; gap: 8px; margin-top: auto;">
                                <input type="number" id="qty-${itemDoc.id}" value="1" min="1" style="width: 50px; text-align: center;">
                                <button class="add-btn" onclick="window.handleAddToCart('${itemDoc.id}', '${item.name}', ${finalPrice})">Add to Order</button>
                            </div>
                        </div>
                    `;
                });
                section.appendChild(grid);
                menuContainer.appendChild(section);
            }
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        menuContainer.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    }
}
fetchMenu();
