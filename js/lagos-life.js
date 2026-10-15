const LagosLife = (() => {
    let player = null;
    let initialised = false;
    let lastSubmissionAt = 0;

    async function init() {
        try {
            const result = await Vatar.init();

            player = result.player;
            initialised = true;

            document.dispatchEvent(
                new CustomEvent("lagoslife:ready", {
                    detail: {
                        player: result.player,
                        mode: result.mode
                    }
                })
            );

            Vatar.onPause(() => {
                document.dispatchEvent(
                    new Event("lagoslife:pause")
                );
            });

            Vatar.onResume(() => {
                document.dispatchEvent(
                    new Event("lagoslife:resume")
                );
            });

            return result;
        } catch (error) {
            console.warn(
                "Lagos Life unavailable:",
                error.code || error.message
            );

            return null;
        }
    }

    async function submitScore(score) {
        if (!initialised || !Number.isFinite(score) || score < 0) {
            return null;
        }

        // Avoid attempting submissions more frequently
        // than Lagos Life's 20-second limit.
        if (Date.now() - lastSubmissionAt < 20000) {
            return null;
        }

        lastSubmissionAt = Date.now();

        try {
            return await Vatar.submitScore(Math.floor(score));
        } catch (error) {
            console.warn("Score submission failed:", error.code);
            return null;
        }
    }

    async function getLeaderboard() {
        if (!initialised) return null;

        try {
            return await Vatar.leaderboard();
        } catch (error) {
            console.warn("Leaderboard unavailable:", error.code);
            return null;
        }
    }

    return {
        init,
        submitScore,
        getLeaderboard,
        getPlayer: () => player
    };
})();

document.addEventListener("DOMContentLoaded", () => {
    LagosLife.init();
});