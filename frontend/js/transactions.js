document.addEventListener("DOMContentLoaded", () => {
    const transactionsList = document.getElementById("transactionsList");
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user?.id;

    if (!user) {
        // Redirect to login if not authenticated
        alert("You must be logged in to view this page.");
        window.location.href = "login.html";
        return;
    }

    const fetchTransactions = async () => {
        transactionsList.innerHTML = "Loading transactions...";
        try {
            // Updated endpoint to fetch transactions instead of books
            const response = await fetch("http://localhost:3000/transactions");
            const transactions = await response.json();
            renderTransactions(transactions);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            transactionsList.innerHTML = "<p>Failed to load transactions. Please try again later.</p>";
        }
    };

    const renderTransactions = (transactions) => {
        if (transactions.length === 0) {
            transactionsList.innerHTML = "<p>No transactions found.</p>";
            return;
        }

        transactionsList.innerHTML = "";
        transactions.forEach(transaction => {
            const transactionItem = document.createElement("div");
            transactionItem.className = "transaction-item";
            
            // Format the timestamp for better readability
            const date = new Date(transaction.timestamp).toLocaleString();
            
            // Use different classes or icons for 'borrow' vs 'return'
            const typeClass = transaction.type === 'borrow' ? 'borrow-transaction' : 'return-transaction';

            transactionItem.innerHTML = `
                <div class="transaction-details ${typeClass}">
                    <p class="transaction-info">
                        <strong>${transaction.type === 'borrow' ? 'Borrowed' : 'Returned'}</strong>
                        by <strong>${transaction.user.username}</strong>
                    </p>
                    <p class="transaction-book">
                        Book: <em>${transaction.book.title}</em> by ${transaction.book.author}
                    </p>
                    <p class="transaction-date">
                        Date: ${date}
                    </p>
                </div>
            `;
            transactionsList.appendChild(transactionItem);
        });
    };

    // Initial fetch of transactions when the page loads
    fetchTransactions();
});