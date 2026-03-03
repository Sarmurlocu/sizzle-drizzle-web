import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 抽象化：處理 Firebase 的 Map 格式標籤
function formatNutrientsFromMap(tagsMap) {
    if (!tagsMap) return "";
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
                    const basePrice = item.base_price || 0;
                    const isDiscounted = item.is_discounted === true;
                    const finalPrice = isDiscounted ? (basePrice * (item.discount_rate || 1)) : basePrice;

                    // 周全的防禦：處理 ID 中的撇號或空格，防止 HTML 語法報錯
                    const safeId = itemDoc.id.replace(/[^a-z0-9]/gi, '_');

                    grid.innerHTML += `
                        <div class="item-card">
                            <h3>${item.name || 'Unnamed Item'}</h3>
                            <div class="nutrient-container">${formatNutrientsFromMap(item.nutrition_tags)}</div>
                            <div class="price-row" style="margin: 10px 0; font-weight: 800;">
                                ${isDiscounted ? 
                                    `<span style="color:#e63946;">$${safePrice(finalPrice)}</span> 
                                     <span style="text-decoration:line-through; color:#999; font-size:0.8rem; margin-left:5px;">$${safePrice(basePrice)}</span>` : 
                                    `<span>$${safePrice(basePrice)}</span>`
                                }
                            </div>
                            <p style="font-size: 0.7rem; color: #888;">Stock: ${item.stock || 0}</p>
                            <div style="display: flex; gap: 8px; margin-top: auto;">
                                <input type="number" id="qty-${safeId}" value="1" min="1" style="width: 50px; text-align: center;">
                                <button class="add-btn" onclick="window.handleAddToCart('${itemDoc.id}', '${item.name}', ${finalPrice}, '${safeId}')">
                                    Add to Order
                                </button>
                            </div>
                        </div>
                    `;
                });
                section.appendChild(grid);
                menuContainer.appendChild(section);
            }
        }
    } catch (error) {
        console.error("Menu Sync Error:", error);
        menuContainer.innerHTML = `<p style="color:red;">Sync Error: ${error.message}</p>`;
    }
}
fetchMenu();
