import { db } from './firebase-config.js'; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- UI Toggle & Category Logic ---
window.toggleOrderSystem = () => {
    const section = document.getElementById('order-system-section');
    if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
    } else {
        section.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

async function fetchMenu() {
    const menuContainer = document.getElementById('menu-container');
    const categoryNav = document.getElementById('category-nav');
    if (!menuContainer || !categoryNav) return;

    try {
        console.log("✅ Fetching multi-category menu...");
        const menuSnapshot = await getDocs(collection(db, "menu"));
        
        categoryNav.innerHTML = ""; // Reset nav
        menuContainer.innerHTML = ""; // Reset container

        for (const categoryDoc of menuSnapshot.docs) {
            const categoryData = categoryDoc.data();
            const categoryId = categoryDoc.id;

            // 1. Create Nav Button (Algorithm: Filter-based UI)
            const navBtn = document.createElement('button');
            navBtn.className = 'nav-btn';
            navBtn.innerText = categoryData.display_name || categoryId;
            navBtn.onclick = () => {
                // Defensive Logic: Show only selected category
                document.querySelectorAll('.menu-category').forEach(sec => sec.style.display = 'none');
                document.getElementById(`section-${categoryId}`).style.display = 'block';
                // Active state styling
                document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                navBtn.classList.add('active');
            };
            categoryNav.appendChild(navBtn);

            // 2. Create Category Section
            const section = document.createElement('section');
            section.className = 'menu-category';
            section.id = `section-${categoryId}`;
            section.style.display = 'none'; // Hidden by default
            section.innerHTML = `
                <h2 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">${categoryData.display_name || categoryId}</h2>
                <div class="items-grid" id="grid-${categoryId}">Loading...</div>
            `;
            menuContainer.appendChild(section);

            // 3. Fetch Items for this Category
            const itemsSnapshot = await getDocs(collection(db, `menu/${categoryId}/items`));
            const grid = document.getElementById(`grid-${categoryId}`);
            grid.innerHTML = ""; 

            itemsSnapshot.forEach((itemDoc) => {
                const item = itemDoc.data();
                const itemId = itemDoc.id;
                const basePrice = item.base_price || 0;
                const safeName = item.name.replace(/'/g, "\\'");

                const itemCard = document.createElement('div');
                itemCard.className = 'item-card';
                itemCard.innerHTML = `
                    <h3 style="margin:0 0 10px 0;">${item.name}</h3>
                    <p class="price-tag">$${basePrice.toFixed(2)}</p>
                    <div style="margin: 15px 0;">
                        <label>Qty: </label>
                        <input type="number" id="qty-${itemId}" value="1" min="1" 
                               style="width: 50px; padding: 5px; border-radius: 5px; border: 1px solid #ccc;">
                    </div>
                    <button onclick="window.handleAddToCart('${itemId}', '${safeName}', ${basePrice})" 
                            style="width:100%; padding:12px; background:#007bff; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">
                        Add to List
                    </button>
                `;
                grid.appendChild(itemCard);
            });
        }

        // Sentinel Check: Auto-click the first category to show it initially
        if (categoryNav.firstChild) {
            categoryNav.firstChild.click();
        }

    } catch (error) {
        console.error("Database Error:", error);
    }
}

fetchMenu();
