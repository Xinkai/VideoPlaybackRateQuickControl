// ==UserScript==
// @name         Youtube Playback Rate
// @namespace    http://cuoan.net/
// @version      0.1
// @description  Easily control YouTube's playback speed
// @author       Xinkai Chen
// @match        http://*/*
// @match        https://*/*
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    class Utils {
        static getAncestorNode(node, selector) {
            let currentNode = node;
            while (currentNode !== document) {
                if (currentNode.matches(selector)) {
                    return currentNode;
                }
                currentNode = currentNode.parentNode;
            }
            return null;
        }

        static formatTime(seconds) {
            const h = (seconds / 3600) | 0;
            const m = (seconds / 60) % 60 | 0;
            const s = (seconds % 60) | 0;
            const m_str = (h > 0 && m < 10) ? `0${m}` : `${m}`;
            const s_str = s < 10 ? `0${s}` : `${s}`;
            return h !== 0 ? `${h}:${m_str}:${s_str}` : `${m_str}:${s_str}`;
        }

        static parseTime(str) {
            const splits = str.split(":");
            const len = splits.length;
            let accum = +splits[len - 1];
            accum += (+splits[len-2]) * 60 || 0;
            accum += (+splits[len-3]) * 60 || 0;
            return accum;
        }

        static log(...args) {
            return console.log("PlayRate", ...args);
        }
    }

    class Base {
        constructor({ player, container }) {
            this.player = player;
            this.container = container;
            this.rate = this.player.playbackRate;
            this.warpedTimeIndicator = null;
            this.statusOverlay = null;
            this.overlayTimer = null;
            this.toolbar = null;
        }

        initialize = () => {
            if (this.player.getAttribute("playrate-loaded")) {
                return;
            }
            this.player.setAttribute("playrate-loaded", true);

            this.toolbar = this.getToolbar();
            this.styleToolbar();

            this.warpedTimeIndicator = this.createWarpedTimeIndicator();
            this.styleWarpedTimeIndicator();
            this.placeWarpedTimeIndicator(this.toolbar);

            this.statusOverlay = this.createStatusOverlay();
            this.placeStatusOverlay();

            this.updateDuration();
            this.player.addEventListener("durationchange", this.updateDuration);

            this.setupUserInputListeners();

        }

        showStatusOverlay = () => {
            if (this.overlayTimer) {
                clearTimeout(this.overlayTimer);
            }
            this.statusOverlay.overlay.style.visibility = "visible";
            this.overlayTimer = setTimeout(() => {
                this.statusOverlay.overlay.style.visibility = "hidden";
                this.overlayTimer = null;
            }, 1500);
        }

        updateCurrent = () => {
            this.warpedTimeIndicator.current.innerText = Utils.formatTime(this.player.currentTime / this.rate);
        }

        updateDuration = () => {
            this.warpedTimeIndicator.duration.innerText = Utils.formatTime(this.player.duration / this.rate);
        }

        updateStatusOverlay = () => {
            this.statusOverlay.status.innerText = `${this.player.playbackRate * 100 | 0}%`;
        }

        setupUserInputListeners = () => {
            this.warpedTimeIndicator.root.addEventListener("wheel", event => {
                if (event.deltaY < 0) {
                    this.changeRate(event, 0.1);
                } else {
                    this.changeRate(event, -0.1);
                }
            });

            document.addEventListener("keydown", event => {
                if (event.target.tagName !== "INPUT" &&
                    event.target.contentEditable === "inherit") {
                    if (event.code === "NumpadAdd") {
                        this.changeRate(event, 0.1);
                    } else if (event.code === "NumpadSubtract") {
                        this.changeRate(event, -0.1);
                    }
                }
            });

            this.player.addEventListener("ratechange", this.onRateReset);
            this.player.addEventListener("loadedmetadata", this.onRateReset);
            this.player.addEventListener("timeupdate", this.updateCurrent);
        }

        changeRate = (event, delta) => {
            if ((delta > 0 && this.player.playbackRate < 4) ||
                (delta < 0 && this.player.playbackRate > 0.2)) {
                this.showStatusOverlay();
                event.stopPropagation();
                event.preventDefault();
                this.player.playbackRate += delta;
            }
        }

        static getPlayer = async() => {
            const player = document.querySelector("video,audio");
            if (player) {
                return player;
            }

            return new Promise(resolve => {
                const onMetaDataloaded = event => {
                    const tagName = event.target.tagName;
                    if (tagName === "VIDEO" || tagName === "AUDIO") {
                        document.removeEventListener("loadedmetadata", onMetaDataloaded, true);
                        resolve(event.target);
                    }
                };
                document.body.addEventListener("loadedmetadata", onMetaDataloaded, true);
            });
        }

        static launch = async() => {
            const player = await this.getPlayer();

            const siteDetectors = {
                ".html5-video-player": Youtube,
                ".bilibili-player-video-wrap": Bilibili,
            };

            for (const [containerSelector, Provider] of Object.entries(siteDetectors)) {
                const container = Utils.getAncestorNode(player, containerSelector);
                if (container) {
                    new Provider({ player, container });
                    break;
                }
            }
        }

        createWarpedTimeIndicator = () => {
            const root = document.createElement("div");

            const current = document.createElement("span");
            root.appendChild(current);

            const separator = document.createElement("span");
            separator.innerText = " / ";
            root.appendChild(separator);

            const duration = document.createElement("span");
            root.appendChild(duration);

            return {
                root,
                current,
                separator,
                duration,
            };
        }

        createStatusOverlay = () => {
            const status = document.createElement("div");
            status.style.textAlign = "center";
            status.style.margin = "auto";
            status.style.fontSize = "11em";
            status.style.color = "rgba(255,255,255, 0.5)";

            const overlay = document.createElement("div");
            overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
            overlay.style.zIndex = 10;
            overlay.style.width = "50%";
            overlay.style.height = "50%";
            overlay.style.position = "absolute";
            overlay.style.display = "flex";
            overlay.style.visibility = "hidden";
            overlay.style.top = "25%";
            overlay.style.left = "25%";
            overlay.style.pointerEvents = "none";
            overlay.style.transition = "all 0.5s linear";

            overlay.appendChild(status);

            return {
                status,
                overlay,
            };
        }

        getToolbar = () => {
            throw new Error("Abstract");
        }

        styleToolbar = () => {
            throw new Error("Abstract");
        }

        styleWarpedTimeIndicator = () => {
            throw new Error("Abstract");
        }

        placeWarpedTimeIndicator = (toolbar) => {
            throw new Error("Abstract");
        }

        placeStatusOverlay = () => {
            throw new Error("Abstract");
        }

        onRateReset = () => {
            this.rate = this.player.playbackRate;
            this.updateStatusOverlay();
            this.updateCurrent();
            this.updateDuration();
        }
    }

    class Youtube extends Base {
        constructor({ player, container }) {
            super({ player, container });
            this.initialize();
        }

        getToolbar = () => {
            return this.container.querySelector(".ytp-right-controls");
        }

        styleToolbar = () => {
            // fix style: floating .ytp-right-controls may overflow
            this.toolbar.parentNode.style.position = "relative";
            this.toolbar.style.position = "absolute";
            this.toolbar.style.right = "0";
            this.toolbar.style.top = "0";
            this.toolbar.style.float = "none";
        }

        styleWarpedTimeIndicator = () => {
            const {
                root,
                current,
                separator,
                duration,
            } = this.warpedTimeIndicator;
            root.classList.add("ytp-time-display", "playrate-ext", "notranslate");
            current.classList.add("ytp-time-current");
            separator.classList.add("ytp-time-separator");
            duration.classList.add("ytp-time-duration");
        }

        placeWarpedTimeIndicator = (toolbar) => {
            toolbar.insertBefore(this.warpedTimeIndicator.root, toolbar.firstChild);
        }

        placeStatusOverlay = () => {
            this.container.appendChild(this.statusOverlay.overlay);
        }
    }

    class Bilibili extends Base {
        constructor({ player, container }) {
            super({ player, container });
            this.initialize();
        }

        getToolbar = () => {
            return this.container.querySelector(".bilibili-player-video-control");
        }

        styleToolbar = () => {

        }

        styleWarpedTimeIndicator = () => {
            const {
                root,
                current,
                separator,
                duration,
            } = this.warpedTimeIndicator;
            root.classList.add("bilibili-player-video-time");
            root.style.color = "white";
            root.style.width = "60px";
            current.classList.add("bilibili-player-video-time-now");
            separator.classList.add("bilibili-player-video-divider");
            duration.classList.add("bilibili-player-video-time-total");
        }

        placeWarpedTimeIndicator = (toolbar) => {
            const bottom = this.toolbar.querySelector(".bilibili-player-video-control-bottom-right");
            const intervalTimer = setInterval(() => {
                const originSpeed = bottom.querySelector(".bilibili-player-video-btn-speed");
                if (!originSpeed) {
                    return;
                }
                 bottom.insertBefore(this.warpedTimeIndicator.root, originSpeed);
                originSpeed.style.display = "none";
                clearInterval(intervalTimer);
            }, 100);
        }

        placeStatusOverlay = () => {
            this.container.appendChild(this.statusOverlay.overlay);
        }
    }

    function onload() {
        document.removeEventListener("DOMContentLoaded", onload);
        Base.launch();
    }

    document.addEventListener("DOMContentLoaded", onload);
})();
