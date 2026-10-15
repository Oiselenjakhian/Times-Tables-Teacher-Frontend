"use strict";

const Premium = (() => {
    const PRODUCT_ID = "times_tables_challenge_pack";

    const buyButton = document.getElementById("buy-challenge-pack");
    const message = document.getElementById("purchase-message");

    let ready = false;
    let busy = false;

    function showMessage(text) {
        if (message) {
            message.textContent = text;
        }
    }

    async function claimPurchase(purchase) {
        // Validate the minimum fields expected from the SDK.
        if (
            !purchase ||
            !purchase.purchaseId ||
            purchase.productId !== PRODUCT_ID
        ) {
            return;
        }

        showMessage("Verifying your purchase...");

        try {
            // Ask Lagos Life for the current player session.
            const { session } = await Vatar.session();

            // The backend must independently verify the session and purchase.
            const response = await fetch("/claim", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    session,
                    purchaseId: purchase.purchaseId
                })
            });

            if (!response.ok) {
                throw new Error("Server verification failed");
            }

            const result = await response.json();

            if (result.ok !== true) {
                throw new Error("The purchase was not confirmed");
            }

            showMessage("Challenge Pack unlocked!");

            // Connect this to your actual game content.
            if (typeof Game !== "undefined" &&
                typeof Game.unlockChallengePack === "function") {
                Game.unlockChallengePack();
            }
        } catch (error) {
            console.error("Premium claim failed:", error);
            showMessage(
                "We couldn't verify your purchase. Please try again."
            );
        }
    }

    async function buy() {
        if (!ready || busy) {
            showMessage(
                "Please open the game inside Lagos Life and try again."
            );
            return;
        }

        busy = true;

        if (buyButton) {
            buyButton.disabled = true;
        }

        try {
            showMessage("Opening checkout...");

            const purchase = await Vatar.purchase(PRODUCT_ID);

            await claimPurchase(purchase);
        } catch (error) {
            console.error("Purchase failed:", error);

            showMessage(
                error?.code === "cancelled"
                    ? "Purchase cancelled."
                    : "Purchase unavailable. Please try again."
            );
        } finally {
            busy = false;

            if (buyButton) {
                buyButton.disabled = false;
            }
        }
    }

    async function init() {
        if (!window.Vatar) {
            showMessage(
                "Purchases are available when the game is opened through Lagos Life."
            );
            return;
        }

        try {
            await Vatar.init();

            // Listen for purchases completed through the SDK.
            Vatar.onPurchase(claimPurchase);

            // Restore purchases exposed by the SDK.
            const purchases = await Vatar.purchases();

            for (const purchase of purchases) {
                await claimPurchase(purchase);
            }

            ready = true;
        } catch (error) {
            console.error("Premium initialisation failed:", error);
            showMessage("Premium features could not be initialised.");
        }
    }

    if (buyButton) {
        buyButton.addEventListener("click", buy);
    }

    return {
        init,
        buy
    };
})();

Premium.init();