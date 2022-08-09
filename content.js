// ==UserScript==
// @name         Video Playback Rate Quick Control
// @namespace    https://github.com/Xinkai
// @version      1.9.1
// @description  Easily control video playback speed
// @author       Xinkai Chen <xinkai.chen@qq.com>
// @match        *://*.youtube.com/*
// @match        *://*.bilibili.com/*
// @match        *://*.odysee.com/*
// @supportURL   https://github.com/Xinkai/VideoPlaybackRateQuickControl
// @license      MIT
// @run-at       document-start
// @grant        none
// ==/UserScript==

/* eslint-disable max-classes-per-file */

(() => {
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
            const h = (seconds / 3600) | 0; // eslint-disable-line no-bitwise
            const m = (seconds / 60) % 60 | 0; // eslint-disable-line no-bitwise
            const s = (seconds % 60) | 0; // eslint-disable-line no-bitwise
            const mStr = (h > 0 && m < 10) ? `0${m}` : `${m}`;
            const sStr = s < 10 ? `0${s}` : `${s}`;
            return h !== 0 ? `${h}:${mStr}:${sStr}` : `${mStr}:${sStr}`;
        }

        static parseTime(str) {
            const splits = str.split(":");
            const len = splits.length;
            let accum = +splits[len - 1];
            accum += (+splits[len - 2]) * 60 || 0;
            accum += (+splits[len - 3]) * 60 || 0;
            return accum;
        }

        static log(...args) {
            /* eslint-disable-next-line no-console */
            return console.log("PlayRate", ...args);
        }

        static error(...args) {
            /* eslint-disable-next-line no-console */
            return console.error("PlayRate", ...args);
        }

        static awaitForMedia = (callback) => {
            const onMetaDataLoaded = (event) => {
                const { tagName } = event.target;
                if (tagName === "VIDEO" || tagName === "AUDIO") {
                    callback(event.target);
                }
            };
            document.body.addEventListener("loadedmetadata", onMetaDataLoaded, true);
            return () => {
                document.body.removeEventListener("loadedmetadata", onMetaDataLoaded, true);
            };
        };

        static awaitForDescendant = async (node, selectors) => {
            for (const selector of selectors) {
                const attempt = node.querySelector(selector);
                if (attempt != null) {
                    return attempt;
                }
            }
            return new Promise((resolve) => {
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.type !== "childList") {
                            continue;
                        }
                        for (const addedNode of mutation.addedNodes) {
                            if (addedNode instanceof HTMLElement) {
                                if (selectors.some((selector) => addedNode.matches(selector))) {
                                    observer.disconnect();
                                    resolve(addedNode);
                                }
                            }
                        }
                    }
                });
                observer.observe(node, { subtree: true, childList: true });
            });
        };

        static domainMatches(host) {
            return window.location.host === host || window.location.host.endsWith(`.${host}`);
        }
    }

    class SiteImpl {
        constructor($container) {
            this.$container = $container;
        }

        /**
         * @abstract
         */
        // eslint-disable-next-line class-methods-use-this
        placeWarpedTimeIndicator = async ({
            $warpedTimeIndicator, $currentWarped, $separator, $durationWarped, // eslint-disable-line no-unused-vars
        }) => {

        };

        /**
         * @abstract
         */
        // eslint-disable-next-line class-methods-use-this
        placeStatusOverlay = ({ $overlay }) => { // eslint-disable-line no-unused-vars

        };
    }

    class YoutubeImpl extends SiteImpl {
        constructor($container) {
            super($container);
            this.$container = $container;
        }

        placeWarpedTimeIndicator = async ({
            $warpedTimeIndicator, $currentWarped, $separator, $durationWarped,
        }) => {
            const $toolbar = this.$container.querySelector(".ytp-right-controls");

            // fix style: floating .ytp-right-controls may overflow
            $toolbar.parentNode.style.position = "relative";
            Object.assign($toolbar.style, {
                position: "absolute",
                right: 0,
                top: 0,
                float: "none",
            });

            $warpedTimeIndicator.classList.add("ytp-time-display", "playrate-ext", "notranslate");
            $currentWarped.classList.add("ytp-time-current");
            $separator.classList.add("ytp-time-separator");
            $durationWarped.classList.add("ytp-time-duration");

            $toolbar.insertBefore($warpedTimeIndicator, $toolbar.firstChild);
        };

        placeStatusOverlay = ({ $overlay }) => {
            this.$container.appendChild($overlay);
        };
    }

    class BilibiliImpl extends SiteImpl {
        constructor($container) {
            super($container);
            this.$container = $container;
        }

        placeWarpedTimeIndicator = async ({
            $warpedTimeIndicator, $currentWarped, $separator, $durationWarped, // eslint-disable-line no-unused-vars
        }) => {
            const $originalPlayBackRate = await Utils.awaitForDescendant(
                this.$container,
                [
                    ".bpx-player-ctrl-playbackrate",
                    ".squirtle-speed-wrap",
                ],
            );
            if ($originalPlayBackRate.matches(".bpx-player-ctrl-playbackrate")) {
                $warpedTimeIndicator.classList.add("bpx-player-ctrl-btn");
                Object.assign($warpedTimeIndicator.style, {
                    width: "auto",
                    fontSize: "14px",
                    fontWeight: 600,
                });
            } else {
                $warpedTimeIndicator.classList.add("squirtle-block-wrap");
                Object.assign($warpedTimeIndicator.style, {
                    height: "auto",
                    fontSize: "14px",
                    fontWeight: 600,
                });
            }

            $originalPlayBackRate.parentNode.insertBefore($warpedTimeIndicator, $originalPlayBackRate);
        };

        placeStatusOverlay = ({ $overlay }) => {
            this.$container.appendChild($overlay);
        };
    }

    class OdyseeImpl extends SiteImpl {
        constructor($container) {
            super($container);
            this.$container = $container;
        }

        placeWarpedTimeIndicator = async ({
            $warpedTimeIndicator, $currentWarped, $separator, $durationWarped, // eslint-disable-line no-unused-vars
        }) => {
            const $originalPlayBackRate = await Utils.awaitForDescendant(this.$container, [".vjs-playback-rate"]);

            $warpedTimeIndicator.classList.add("vjs-menu-button", "vjs-playback-rate", "vjs-control");
            Object.assign($warpedTimeIndicator.style, {
                width: "auto",
            });

            $originalPlayBackRate.parentNode.insertBefore($warpedTimeIndicator, $originalPlayBackRate);
        };

        placeStatusOverlay = ({ $overlay }) => {
            this.$container.appendChild($overlay);
        };
    }

    class PlayRate {
        constructor({ impl, $media }) {
            this.impl = impl;
            this.$media = $media;
            this.unloads = [];

            {
                // Set up warped time indicator
                this.$warpedTimeIndicator = document.createElement("div");

                this.$currentWarped = document.createElement("span");
                this.$warpedTimeIndicator.appendChild(this.$currentWarped);

                const $separator = document.createElement("span");
                $separator.innerText = " / ";
                this.$warpedTimeIndicator.appendChild($separator);

                this.$durationWarped = document.createElement("span");
                this.$warpedTimeIndicator.appendChild(this.$durationWarped);
                this.impl.placeWarpedTimeIndicator({
                    $warpedTimeIndicator: this.$warpedTimeIndicator,
                    $currentWarped: this.$currentWarped,
                    $separator,
                    $durationWarped: this.$durationWarped,
                });
            }

            {
                // Set up status overlay
                this.$overlayText = document.createElement("div");
                Object.assign(this.$overlayText.style, {
                    textAlign: "center",
                    margin: "auto",
                    fontSize: "11em",
                    color: "rgba(255,255,255, 0.5)",
                });

                this.$overlay = document.createElement("div");
                Object.assign(this.$overlay.style, {
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    zIndex: 10,
                    width: "50%",
                    height: "50%",
                    position: "absolute",
                    display: "flex",
                    visibility: "hidden",
                    top: "25%",
                    left: "25%",
                    pointerEvents: "none",
                    transition: "all 0.5s linear",
                });

                this.$overlay.appendChild(this.$overlayText);
                this.impl.placeStatusOverlay({ $overlay: this.$overlay });
            }

            this.overlayTimer = null;

            this.updateDuration();
            this.setupUserInputListeners();
        }

        addNodeEventListener = (node, eventName, handler) => {
            node.addEventListener(eventName, handler);
            this.unloads.push(() => node.removeEventListener(eventName, handler));
        };

        unload = () => {
            this.clearShowStatusOverlay();
            this.unloads.forEach((fn) => fn());
            if (this.$overlay) {
                this.$overlay.remove();
                this.$overlay = null;
            }
            if (this.$warpedTimeIndicator) {
                this.$warpedTimeIndicator.remove();
                this.$warpedTimeIndicator = null;
            }
        };

        clearShowStatusOverlay = () => {
            if (this.overlayTimer) {
                clearTimeout(this.overlayTimer);
                this.overlayTimer = null;
            }
        };

        showStatusOverlay = () => {
            this.clearShowStatusOverlay();

            this.$overlay.style.visibility = "visible";
            this.overlayTimer = setTimeout(() => {
                this.$overlay.style.visibility = "hidden";
                this.overlayTimer = null;
            }, 1500);
        };

        updateCurrent = () => {
            this.$currentWarped.innerText = Utils.formatTime(this.$media.currentTime / this.rate);
        };

        updateDuration = () => {
            this.$durationWarped.innerText = Utils.formatTime(this.$media.duration / this.rate);
        };

        updateOverlayText = () => {
            this.$overlayText.innerText = `${Math.round(this.$media.playbackRate * 100)}%`;
        };

        rateStepChange = (event) => {
            if (this.changeRate(event.deltaY < 0 ? 0.1 : -0.1)) {
                event.stopPropagation();
                event.preventDefault();
            }
        };

        setupUserInputListeners = () => {
            this.addNodeEventListener(this.$warpedTimeIndicator, "wheel", this.rateStepChange);

            this.addNodeEventListener(document, "keydown", (event) => {
                if (event.target.tagName !== "INPUT"
                    && event.target.contentEditable === "inherit") {
                    const step = {
                        NumpadAdd: 0.1,
                        NumpadSubtract: -0.1,
                    }[event.code];
                    if (step && this.changeRate(step)) {
                        event.stopPropagation();
                        event.preventDefault();
                    }
                }
            });

            this.addNodeEventListener(this.$media, "durationchange", this.updateDuration);
            this.addNodeEventListener(this.$media, "ratechange", this.onRateReset);
            this.addNodeEventListener(this.$media, "loadedmetadata", this.onRateReset);
            this.addNodeEventListener(this.$media, "timeupdate", this.updateCurrent);
        };

        changeRate = (step) => {
            const { playbackRate } = this.$media;
            if ((step > 0 && playbackRate < 4)
                || (step < 0 && playbackRate > 0.2)) {
                const newRate = playbackRate + step;
                this.$media.playbackRate = Math.round(newRate * 100) / 100;
                return true;
            }
            return false;
        };

        onRateReset = () => {
            this.rate = this.$media.playbackRate;
            this.showStatusOverlay();
            this.updateOverlayText();
            this.updateCurrent();
            this.updateDuration();
        };
    }

    function main() {
        let instance = null;
        if (Utils.domainMatches("youtube.com")) {
            Utils.awaitForMedia(($media) => {
                const $container = Utils.getAncestorNode($media, ".html5-video-player");
                if (!$container) {
                    Utils.log("Video not loaded in a container");
                    return;
                }
                const impl = new YoutubeImpl($container);
                if (instance) {
                    instance.unload();
                }
                instance = new PlayRate({ impl, $media });
            });
        } else if (Utils.domainMatches("bilibili.com")) {
            Utils.awaitForMedia(($media) => {
                const $container = Utils.getAncestorNode($media, "#bilibili-player .bpx-player-container");
                if (!$container) {
                    Utils.log("Video not loaded in a container");
                    return;
                }
                const impl = new BilibiliImpl($container);
                if (instance) {
                    instance.unload();
                }
                instance = new PlayRate({ impl, $media });
            });
        } else if (Utils.domainMatches("odysee.com")) {
            Utils.awaitForMedia(($media) => {
                const $container = Utils.getAncestorNode($media, ".video-js");
                if (!$container) {
                    Utils.log("Video not loaded in a container");
                    return;
                }
                const impl = new OdyseeImpl($container);
                if (instance) {
                    instance.unload();
                }
                instance = new PlayRate({ impl, $media });
            });
        }
    }

    function onload() {
        main();
        document.removeEventListener("DOMContentLoaded", onload);
    }

    document.addEventListener("DOMContentLoaded", onload);
})();
