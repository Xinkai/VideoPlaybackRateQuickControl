
(() => {
    'use strict';
    function getSinglePlayer() {
        return document.querySelector("video");
    }

    function getPlayerContainer(player) {
        let container = player;
        while(container !== null) {
            if (container.matches(".html5-video-player")) {
                return container;
            }
            container = container.parentNode;
        }
        return null;
    }

    function getToolButtonBar(container) {
        return container.querySelector(".ytp-right-controls");
    }

    function getTooltipTextWrapper(container) {
        return container.querySelector(".ytp-tooltip-text-wrapper");
    }

    function formatTime(total) {
        const h = (total / 3600) | 0;
        const m = (total / 60) % 60 | 0;
        const s = (total % 60) | 0;
        const m_str = (h > 0 && m < 10) ? `0${m}` : `${m}`;
        const s_str = s < 10 ? `0${s}` : `${s}`;
        return h !== 0 ? `${h}:${m_str}:${s_str}` : `${m_str}:${s_str}`;
    }

    function unformatTime(str) {
        const splits = str.split(":");
        const len = splits.length;
        let accum = +splits[len - 1];
        accum += (+splits[len-2]) * 60 || 0;
        accum += (+splits[len-3]) * 60 || 0;
        return accum;
    }

    function initializePlayer(player) {
        const container = getPlayerContainer(player);
        if (!container) {
            return;
        }
        if (container.classList.contains("playrate-loaded")) {
            return;
        }
        container.classList.add("playrate-loaded");

        const bar = getToolButtonBar(container);
        const tooltip = getTooltipTextWrapper(container);
        const previewTooltip = tooltip.querySelector(".ytp-tooltip-text");
        
        // detect when the original preview text is changed
        let frameId = 0;

        const oldRemoveChild = previewTooltip.removeChild.bind(previewTooltip);
        previewTooltip.removeChild = what => {
            if (frameId) {
                cancelAnimationFrame(frameId);
                frameId = 0;
            }
            frameId = requestAnimationFrame(() => {
                const time = unformatTime(previewTooltip.innerHTML);
                if (time) {
                    updatePreviewText(formatTime(time / player.playbackRate));
                } else {
                    previewText.style.display = "none";
                }
                frameId = 0;
            });
            return oldRemoveChild(what);
        };

        const previewText = document.createElement("span");
        previewText.classList.add("ytp-tooltip-text");
        tooltip.appendChild(previewText);

        const updatePreviewText = (v) => {
            previewText.innerHTML = v;
            previewText.style.display = "inline";
        };

        let rate = 1;

        let timer = 0;

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("ytp-time-display");
        buttonContainer.classList.add("playrate-ext");
        buttonContainer.classList.add("notranslate");

        const changeRate = (event, delta) => {
            if ((delta > 0 && player.playbackRate < 4) ||
                (delta < 0 && player.playbackRate > 0.2)) {
                showStatus();
                event.stopPropagation();
                event.preventDefault();
                player.playbackRate += delta;
            }
        };

        buttonContainer.addEventListener("mousewheel", event => {
            if (event.deltaY < 0) {
                changeRate(event, 0.1);
            } else {
                changeRate(event, -0.1);
            }
        });

        document.addEventListener("keydown", event => {
            if (event.target.tagName !== "INPUT" &&
                event.target.contentEditable === "inherit") {
                if (event.code === "NumpadAdd") {
                    changeRate(event, 0.1);
                } else if (event.code === "NumpadSubtract") {
                    changeRate(event, -0.1);
                }
            }
        });

        const showStatus = () => {
            if (timer) {
                clearTimeout(timer);
            }
            statusContainer.style.visibility = "visible";
            timer = setTimeout(() => {
                statusContainer.style.visibility = "hidden";
                timer = 0;
            }, 1500);
        };

        const current = document.createElement("span");
        current.classList.add("ytp-time-current");
        buttonContainer.appendChild(current);

        const separator = document.createElement("span");
        separator.classList.add("ytp-time-separator");
        separator.innerHTML = " / ";
        buttonContainer.appendChild(separator);

        const duration = document.createElement("span");
        duration.classList.add("ytp-time-duration");
        buttonContainer.appendChild(duration);

        bar.insertBefore(buttonContainer, bar.firstChild);

        const status = document.createElement("div");
        status.style.textAlign = "center";
        status.style.margin = "auto";
        status.style.fontSize = "11em";
        status.style.color = "rgba(255,255,255, 0.5)";

        const statusContainer = document.createElement("div");
        statusContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        statusContainer.style.zIndex = 10;
        statusContainer.style.width = "50%";
        statusContainer.style.height = "50%";
        statusContainer.style.position = "absolute";
        statusContainer.style.display = "flex";
        statusContainer.style.visibility = "hidden";
        statusContainer.style.top = "25%";
        statusContainer.style.left = "25%";
        statusContainer.style.pointerEvents = "none";
        statusContainer.style.transition = "all 0.5s linear";

        statusContainer.appendChild(status);
        container.appendChild(statusContainer);

        {
            // fix style: floating .ytp-right-controls may overflow
            bar.parentNode.style.position = "relative";
            bar.style.position = "absolute";
            bar.style.right = "0";
            bar.style.top = "0";
            bar.style.float = "none";
        }

        const updateCurrent = () => {
            current.innerHTML = formatTime(player.currentTime / rate);
        };
        updateCurrent();

        const updateDuration = () => {
            duration.innerHTML = formatTime(player.duration / rate);
        };
        updateDuration();
        player.addEventListener("durationchange", updateDuration);

        const updateStatus = () => {
            status.innerHTML = `${player.playbackRate * 100 | 0}%`;
        };

        const onRateReset = () => {
            rate = player.playbackRate;
            updateStatus();
            updateCurrent();
            updateDuration();
        };

        player.addEventListener("ratechange", onRateReset);
        player.addEventListener("loadedmetadata", onRateReset);
        player.addEventListener("timeupdate", updateCurrent);
    }

    function onload() {
        document.removeEventListener("DOMContentLoaded", onload);
        if (document.domain === "www.youtube.com") {
            const player = getSinglePlayer();
            if (player) {
                console.log("Init...");
                initializePlayer(player);
            } else {
                const onMetaDataloaded = event => {
                    const tagName = event.target.tagName;
                    if (tagName === "VIDEO" || tagName === "AUDIO") {
                        document.removeEventListener("loadedmetadata", onMetaDataloaded, true);
                        console.log("Late Init...");
                        initializePlayer(event.target);
                    }
                };
                document.body.addEventListener("loadedmetadata", onMetaDataloaded, true);
            }
        }
    }

    document.addEventListener("DOMContentLoaded", onload);
})();
