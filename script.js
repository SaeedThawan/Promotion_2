document.addEventListener("DOMContentLoaded", function() {
    // رابط Web App الذي حصلت عليه من Apps Script
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxppttFwtYoCNfa5hpDgAf_e4Rbh5pPxVjFNfxw7RRUKVY6rR8gt2KQqAjbKa97IEu/exec";
    // معرّف ملف Google Sheets، يجب أن تستبدله بمعرف ملفك
    const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";
    // النطاق الذي يحتوي على قائمة مساحات العمل في ورقة DataLists
    const WORKSPACE_RANGE = "DataLists!A2:A";

    const form = document.getElementById('visitForm');
    const statusMessage = document.getElementById('statusMessage');
    const customerDetailsDiv = document.getElementById('customerDetails');
    const starRatingContainer = document.querySelector('.star-rating');
    const starRatingInput = document.getElementById('storeRating');
    const customerNameInput = document.getElementById('customerNameInput');
    const customersDatalist = document.getElementById('customersList');
    const submitBtn = document.getElementById('submitBtn');
    const productTemplate = document.getElementById('product-item-template');
    
    let customersData = [];
    let allProductsData = [];
    let isSubmitting = false;

    // جلب البيانات من ملفات JSON ومن Google Sheets
    Promise.all([
        fetch('sales_representatives.json').then(res => res.json()),
        fetch('customers_main.json').then(res => res.json()),
        fetch('actions_list.json').then(res => res.json()),
        fetch('products.json').then(res => res.json()),
        fetch('governorates.json').then(res => res.json()),
        // جلب قائمة مساحات العمل من Google Sheets
        fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&tq=SELECT%20A%20WHERE%20A%20is%20not%20null&range=${WORKSPACE_RANGE}`)
            .then(res => res.text())
            .then(text => JSON.parse(text.substr(47).slice(0, -2)).table.rows.map(row => row.c[0].v))
    ]).then(([reps, customers, actions, products, governorates, workspaces]) => {
        customersData = customers;
        allProductsData = products;
        
        populateDropdown('salesRepName', reps);
        populateDropdown('actionsTaken', actions);
        populateDropdown('workspaceStatus', workspaces);
        populateDropdown('governorate', governorates);
        
        const productSelects = document.querySelectorAll('.missingProduct');
        productSelects.forEach(select => populateProductsDropdown(select, allProductsData));

        populateCustomersDatalist(customersDatalist, customersData);
    }).catch(error => {
        console.error('Error loading data:', error);
        statusMessage.textContent = 'حدث خطأ في تحميل البيانات الأساسية.';
        statusMessage.className = 'status error';
    });

    // دالة لملء القوائم المنسدلة البسيطة
    function populateDropdown(selectId, data) {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = ''; 
            if (!select.hasAttribute('multiple')) {
                const defaultOption = document.createElement('option');
                defaultOption.value = "";
                defaultOption.textContent = "اختر...";
                defaultOption.disabled = true;
                defaultOption.selected = true;
                select.appendChild(defaultOption);
            }

            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                select.appendChild(option);
            });
        }
    }
    
    // دالة لملء قائمة المنتجات
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

    // دالة لملء قائمة العملاء الذكية
    function populateCustomersDatalist(listElement, customersList) {
        listElement.innerHTML = '';
        customersList.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.Customer_Name_AR;
            option.setAttribute('data-code', customer.Customer_Code);
            listElement.appendChild(option);
        });
    }

    // منطق البحث الديناميكي عن العملاء
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
    
    // ربط كود المنتج واسمه وفئته بحقل الإدخال المخفي عند التغيير
    const productsContainer = document.getElementById('missingProductsContainer');
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

    // دالة إرسال النموذج
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (isSubmitting) return;
        isSubmitting = true;
        submitBtn.disabled = true;
        
        statusMessage.textContent = 'جاري الإرسال...';
        statusMessage.className = 'status loading';
        
        const formData = new FormData(form);
        
        // تجهيز المنتجات الناقصة لطلب واحد
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

        
        // تجهيز مساحات العمل لطلب واحد
        const selectedWorkspaces = Array.from(document.getElementById('workspaceStatus').selectedOptions).map(option => option.value);
        if (selectedWorkspaces.length > 0) {
            formData.delete('workspaceStatus');
            selectedWorkspaces.forEach((workspace, index) => {
                formData.append(`مساحة العمل ${index + 1}`, workspace);
            });
        }

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
