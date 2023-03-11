// ==UserScript==
// @name         Video Playback Rate Quick Control
// @namespace    https://github.com/Xinkai
// @version      1.9.4
// @description  Easily control video playback speed
// @author       Xinkai Chen <xinkai.chen@qq.com>
// @match        *://*.youtube.com/*
// @match        *://*.bilibili.com/*
// @match        *://*.odysee.com/*
// @match        *://*.reddit.com/*
// @match        *://*.ixigua.com/*
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
            this.unloads = [];
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
            this.unloads = [];
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
            this.unloads.push(() => $warpedTimeIndicator.remove());
        };

        placeStatusOverlay = ({ $overlay }) => {
            this.$container.appendChild($overlay);
            this.unloads.push(() => $overlay.remove());
        };
    }

    class BilibiliImpl extends SiteImpl {
        constructor($container) {
            super($container);
            this.$container = $container;
            this.unloads = [];
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
            let $elementToInsert = $warpedTimeIndicator;
            if ($originalPlayBackRate.matches(".bpx-player-ctrl-playbackrate")) {
                $warpedTimeIndicator.classList.add("bpx-player-ctrl-time-label");
                Object.assign($warpedTimeIndicator.style, {
                    position: "inherit",
                });
                $currentWarped.classList.add("bpx-player-ctrl-time-current");
                $separator.classList.add("bpx-player-ctrl-time-divide");
                $durationWarped.classList.add("bpx-player-ctrl-time-duration");

                const $wrapper = document.createElement("div");
                $wrapper.classList.add("bpx-player-ctrl-btn", "bpx-player-ctrl-time");
                $wrapper.append($warpedTimeIndicator);
                Object.assign($wrapper.style, {
                    width: "auto",
                    marginRight: 0,
                });
                $elementToInsert = $wrapper;
            } else {
                $warpedTimeIndicator.classList.add("squirtle-block-wrap");
                $warpedTimeIndicator.style.setProperty("height", "auto", "important");
                Object.assign($warpedTimeIndicator.style, {
                    fontSize: "14px",
                    fontWeight: 600,
                });
            }

            $originalPlayBackRate.parentNode.insertBefore($elementToInsert, $originalPlayBackRate);
            $originalPlayBackRate.style.display = "none";
            this.unloads.push(() => {
                $elementToInsert.remove();
                $originalPlayBackRate.style.display = "block";
            });
        };

        placeStatusOverlay = ({ $overlay }) => {
            this.$container.appendChild($overlay);
            this.unloads.push(() => $overlay.remove());
        };
    }

    class OdyseeImpl extends SiteImpl {
        constructor($container) {
            super($container);
            this.$container = $container;
            this.unloads = [];
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
            this.unloads.push(() => $warpedTimeIndicator.remove());
        };

        placeStatusOverlay = ({ $overlay }) => {
            this.$container.appendChild($overlay);
            this.unloads.push(() => $overlay.remove());
        };
    }

    class RedditImpl extends SiteImpl {
        constructor($container) {
            super($container);
            this.$container = $container;
            this.unloads = [];
        }

        placeWarpedTimeIndicator = async ({
            $warpedTimeIndicator, $currentWarped, $separator, $durationWarped, // eslint-disable-line no-unused-vars
        }) => {
            const $originalSettingBtn = (await Utils.awaitForDescendant(this.$container, ["[aria-label='Settings']"]))
                .parentNode;

            $warpedTimeIndicator.classList.add(...$originalSettingBtn.previousElementSibling.classList);

            $originalSettingBtn.parentNode.insertBefore($warpedTimeIndicator, $originalSettingBtn);
            this.unloads.push(() => $warpedTimeIndicator.remove());
        };

        placeStatusOverlay = ({ $overlay }) => {
            this.$container.appendChild($overlay);
            this.unloads.push(() => $overlay.remove());
        };
    }

    class XiguaImpl extends SiteImpl {
        constructor($container) {
            super($container);
            this.$container = $container;
            this.unloads = [];
        }

        placeWarpedTimeIndicator = async ({
            $warpedTimeIndicator, $currentWarped, $separator, $durationWarped, // eslint-disable-line no-unused-vars
        }) => {
            $warpedTimeIndicator.classList.add("xgpcPlayer_textEntry");

            const $entry = document.createElement("div");
            $entry.classList.add("xgplayer-control-item__entry");
            $entry.appendChild($warpedTimeIndicator);

            const $item = document.createElement("div");
            $item.classList.add("xgplayer-control-item", "control_playbackrate", "common-control-item");
            $item.appendChild($entry);

            const $itemContainer = document.createElement("div");
            $itemContainer.classList.add("playerControlsItemContainer");
            $itemContainer.appendChild($item);

            const $originalPlaybackBtn = (await Utils.awaitForDescendant(this.$container, [".control_playbackrate"]))
                .parentNode;

            $originalPlaybackBtn.parentNode.insertBefore($itemContainer, $originalPlaybackBtn);
            $originalPlaybackBtn.style.setProperty("display", "none");
            this.unloads.push(() => {
                $item.remove();
                $originalPlaybackBtn.style.removeProperty("display");
            });
        };

        placeStatusOverlay = ({ $overlay }) => {
            this.$container.appendChild($overlay);
            this.unloads.push(() => $overlay.remove());
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
                const $svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                $svg.setAttribute("viewBox", "0 0 324 200");
                $svg.setAttribute("width", "100%");
                $svg.setAttribute("height", "100%");
                this.$overlayText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                this.$overlayText.setAttribute("x", "50%");
                this.$overlayText.setAttribute("y", "50%");
                this.$overlayText.setAttribute("text-anchor", "middle");
                this.$overlayText.setAttribute("dominant-baseline", "middle");
                this.$overlayText.setAttribute("fill", "rgba(255,255,255, 0.5)");
                this.$overlayText.setAttribute("font-size", "48pt");
                $svg.appendChild(this.$overlayText);

                this.$overlay = document.createElement("div");
                Object.assign(this.$overlay.style, {
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    zIndex: 10,
                    width: "40%",
                    height: "40%",
                    position: "absolute",
                    display: "flex",
                    visibility: "hidden",
                    top: "30%",
                    left: "30%",
                    pointerEvents: "none",
                    transition: "all 0.5s linear",
                });

                this.$overlay.appendChild($svg);
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
            this.impl.unloads.forEach((fn) => fn());
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
            this.$overlayText.textContent = `${Math.round(this.$media.playbackRate * 100)}%`;
        };

        rateStepChange = (event) => {
            if (event.deltaY === 0) {
                return;
            }
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
        } else if (Utils.domainMatches("reddit.com")) {
            Utils.awaitForMedia(($media) => {
                if ($media.src.startsWith("https://")) {
                    Utils.log("Video loaded in slider");
                    return;
                }
                const $container = Utils.getAncestorNode($media, "[data-isvideoplayer='1']");
                if (!$container) {
                    Utils.log("Video not loaded in a container");
                    return;
                }
                const impl = new RedditImpl($container);
                if (instance) {
                    instance.unload();
                }
                instance = new PlayRate({ impl, $media });
            });
        } else if (Utils.domainMatches("ixigua.com")) {
            Utils.awaitForMedia(($media) => {
                const $container = Utils.getAncestorNode($media, "#player_default");
                if (!$container) {
                    Utils.log("Video not loaded in a container");
                    return;
                }
                const impl = new XiguaImpl($container);
                if (instance) {
                    instance.unload();
                }
                instance = new PlayRate({ impl, $media });
            });
        }
    }

    document.addEventListener("DOMContentLoaded", main, { once: true });
})();
