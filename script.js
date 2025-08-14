document.addEventListener("DOMContentLoaded", function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxppttFwtYoCNfa5hpDgAf_e4Rbh5pPxVjFNfxw7RRUKVY6rR8gt2KQqAjbKa97IEu/exec";
    const SPREADSHEET_ID = "135m99kTLyGXKmG9oxW765YXMp_6OtLy8O1x-PeG_G1U";
    const WORKSPACE_RANGE = "DataLists!A2:A";
    const ACTIONS_RANGE = "DataLists!B2:B";

    const form = document.getElementById('visitForm');
    const statusMessage = document.getElementById('statusMessage');
    const customerDetailsDiv = document.getElementById('customerDetails');
    const starRatingContainer = document.querySelector('.star-rating');
    const starRatingInput = document.getElementById('storeRating');
    const customerNameInput = document.getElementById('customerNameInput');
    const customersDatalist = document.getElementById('customersList');
    const submitBtn = document.getElementById('submitBtn');
    const addProductBtn = document.getElementById('addProductBtn');
    const productsContainer = document.getElementById('missingProductsContainer');
    const visitDateInput = document.getElementById('visitDate');
    const visitTimeInput = document.getElementById('visitTime');
    const exitTimeInput = document.getElementById('exitTime');

    let customersData = [];
    let allProductsData = [];
    let isSubmitting = false;

    // Fetch all required data
    Promise.all([
        fetch('sales_representatives.json').then(res => res.json()),
        fetch('customers_main.json').then(res => res.json()),
        fetch('products.json').then(res => res.json()),
        fetch('governorates.json').then(res => res.json()),
        fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&tq=SELECT%20A%20WHERE%20A%20is%20not%20null&range=${WORKSPACE_RANGE}`)
            .then(res => res.text())
            .then(text => JSON.parse(text.substr(47).slice(0, -2)).table.rows.map(row => row.c[0].v)),
        fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&tq=SELECT%20B%20WHERE%20B%20is%20not%20null&range=${ACTIONS_RANGE}`)
            .then(res => res.text())
            .then(text => JSON.parse(text.substr(47).slice(0, -2)).table.rows.map(row => row.c[0].v))
    ]).then(([reps, customers, products, governorates, workspaces, actions]) => {
        customersData = customers;
        allProductsData = products;
        
        populateDropdown('salesRepName', reps);
        populateCheckboxes('workspaceStatus', workspaces, 'workspace');
        populateCheckboxes('actionsTaken', actions, 'action');
        populateDropdown('governorate', governorates);
        
        const productSelects = document.querySelectorAll('.missingProduct');
        productSelects.forEach(select => populateProductsDropdown(select, allProductsData));

        populateCustomersDatalist(customersDatalist, customersData);
    }).catch(error => {
        console.error('Error loading data:', error);
        statusMessage.textContent = 'حدث خطأ في تحميل البيانات الأساسية.';
        statusMessage.className = 'status error';
    });
    
    // Set min date for visitDate input
    const today = new Date().toISOString().split('T')[0];
    visitDateInput.setAttribute('min', today);

    function populateDropdown(selectId, data) {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = ''; 
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "اختر...";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            select.appendChild(defaultOption);

            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                select.appendChild(option);
            });
        }
    }
    
    function populateCheckboxes(containerId, data, prefix) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
            data.forEach((item, index) => {
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox" name="${prefix}${index + 1}" value="${item}"> ${item}`;
                container.appendChild(label);
            });
        }
    }
    
    function populateProductsDropdown(selectElement, productsData) {
        selectElement.innerHTML = '<option value="" disabled selected>اختر منتج</option>';
        productsData.forEach(product => {
            const option = document.createElement('option');
            option.value = product.Product_Name_AR;
            option.setAttribute('data-code', product.Product_Code);
            option.setAttribute('data-category', product.Category);
            option.textContent = product.Product_Name_AR;
            selectElement.appendChild(option);
        });
    }

    function populateCustomersDatalist(listElement, customersList) {
        listElement.innerHTML = '';
        customersList.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.Customer_Name_AR;
            option.setAttribute('data-code', customer.Customer_Code);
            listElement.appendChild(option);
        });
    }

    addProductBtn.addEventListener('click', function() {
        const newItem = document.createElement('div');
        newItem.className = 'missing-product-item';
        newItem.innerHTML = `
            <label>اختر المنتج:</label>
            <select class="missingProduct" name="missingProduct" required></select>
            <input type="hidden" class="missingProductCode" name="missingProductCode">
            <input type="hidden" class="missingProductCategory" name="missingProductCategory">
            <button type="button" class="remove-product-btn"><i class="fas fa-times"></i></button>
        `;
        productsContainer.appendChild(newItem);
        const newSelect = newItem.querySelector('.missingProduct');
        populateProductsDropdown(newSelect, allProductsData);
    });

    productsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-product-btn') || e.target.closest('.remove-product-btn')) {
            const itemToRemove = e.target.closest('.missing-product-item');
            if (productsContainer.children.length > 1) {
                itemToRemove.remove();
            }
        }
    });

    customerNameInput.addEventListener('keyup', function() {
        const searchTerm = this.value.trim().toLowerCase();
        
        if (searchTerm.length > 0) {
            const filteredCustomers = customersData.filter(customer => 
                customer.Customer_Name_AR.toLowerCase().includes(searchTerm)
            );
            populateCustomersDatalist(customersDatalist, filteredCustomers);
        } else {
            populateCustomersDatalist(customersDatalist, customersData);
        }
        
        const selectedOption = Array.from(customersDatalist.options).find(option => option.value === this.value);
        if (selectedOption) {
            const customerCode = selectedOption.getAttribute('data-code');
            const customerName = selectedOption.value;
            document.getElementById('customerCodeHidden').value = customerCode;
            customerDetailsDiv.innerHTML = `<strong>العميل:</strong> ${customerName} <br> <strong>الكود:</strong> ${customerCode}`;
            customerDetailsDiv.style.display = 'block';
        } else {
            document.getElementById('customerCodeHidden').value = '';
            customerDetailsDiv.style.display = 'none';
        }
    });
    
    productsContainer.addEventListener('change', function(e) {
        if (e.target.classList.contains('missingProduct')) {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const itemContainer = e.target.closest('.missing-product-item');
            const codeInput = itemContainer.querySelector('.missingProductCode');
            const categoryInput = itemContainer.querySelector('.missingProductCategory');
            
            if (selectedOption) {
                codeInput.value = selectedOption.getAttribute('data-code');
                categoryInput.value = selectedOption.getAttribute('data-category');
            }
        }
    });

    starRatingContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('star')) {
            const value = e.target.dataset.value;
            starRatingInput.value = value;
            Array.from(starRatingContainer.children).forEach(star => {
                if (parseInt(star.dataset.value) <= parseInt(value)) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }
    });
    

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        isSubmitting = true;
        submitBtn.disabled = true;
        
        statusMessage.textContent = 'جاري الإرسال...';
        statusMessage.className = 'status loading';
        
        const formData = new FormData(form);
        
        const missingProductsNames = [];
        const missingProductsCodes = [];
        const missingProductsCategories = [];
        const productElements = form.querySelectorAll('.missing-product-item');
        productElements.forEach(item => {
            const name = item.querySelector('.missingProduct').value;
            const code = item.querySelector('.missingProductCode').value;
            const category = item.querySelector('.missingProductCategory').value;
            if (name && code) {
                missingProductsNames.push(name);
                missingProductsCodes.push(code);
                missingProductsCategories.push(category);
            }
        });
        
        formData.delete('missingProduct');
        formData.delete('missingProductCode');
        formData.delete('missingProductCategory');
        
        formData.append('missingProduct', missingProductsNames.join(','));
        formData.append('missingProductCode', missingProductsCodes.join(','));
        formData.append('missingProductCategory', missingProductsCategories.join(','));
        
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(result => {
            if (result.includes('Success')) {
                statusMessage.textContent = 'تم إرسال البيانات بنجاح!';
                statusMessage.className = 'status success';
                form.reset();
            } else {
                throw new Error('فشل الإرسال.');
            }
        })
        .catch(error => {
            statusMessage.textContent = 'حدث خطأ: ' + error.message;
            statusMessage.className = 'status error';
            console.error('Error:', error);
        })
        .finally(() => {
            isSubmitting = false;
            submitBtn.disabled = false;
        });
    });
});
