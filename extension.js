// Replace the default workspace switcher popup with workspace thumbnails
// (same as in the right panel in window overview).
// Copyright (C) 2013 Miroslav Sustek

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const St = imports.gi.St;

const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
const ThumbnailsBoxForWorkspaceSwitcher = Me.imports.thumbnailsBoxForWorkspaceSwitcher;

const ANIMATION_TIME = WorkspaceSwitcherPopup.ANIMATION_TIME;
const DISPLAY_TIMEOUT = WorkspaceSwitcherPopup.DISPLAY_TIMEOUT;

let originalWorkspaceSwitcherPopup;

var WorkspaceSwitcherPopupWithThumbnails = GObject.registerClass(
class WorkspaceSwitcherPopupWithThumbnails extends St.Widget {
    _init() {
        super._init({ x: 0,
                      y: 0,
                      width: global.screen_width,
                      height: global.screen_height,
                      style_class: 'workspace-switcher-group' });

        this.actor = new St.Widget({ reactive: true,
                                     style_class: 'workspace-switcher-popup-thumbnails-extension' });
        Main.uiGroup.add_actor(this.actor);

        this._thumbnailsBox = new ThumbnailsBoxForWorkspaceSwitcher.ThumbnailsBoxForWorkspaceSwitcher();
        this._thumbnailsBox._createThumbnails();

        this.actor.add_actor(this._thumbnailsBox.actor);

        this._redisplay();

        this._popupHideTimeoutId = Mainloop.timeout_add(DISPLAY_TIMEOUT, Lang.bind(this, this._onTimeout));
    }

    display() {
        this._redisplay();

        // Restart timeout
        if (this._popupHideTimeoutId)
            Mainloop.source_remove(this._popupHideTimeoutId);
        this._popupHideTimeoutId = Mainloop.timeout_add(DISPLAY_TIMEOUT, Lang.bind(this, this._onTimeout));
    }

    _redisplay() {
        // Stop the hiding animation if the popup should be redisplayed
        Tweener.removeTweens(this._thumbnailsBox.actor, 'opacity');
        this._thumbnailsBox.actor.opacity = 255;

        // Position thumbnailsBox into center of the window
        let workArea = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);

        let [containerMinHeight, containerNatHeight] = this._thumbnailsBox.actor.get_preferred_height(global.screen_width);
        let [containerMinWidth, containerNatWidth] = this._thumbnailsBox.actor.get_preferred_width(containerNatHeight);

        this.actor.x = workArea.x + Math.floor((workArea.width - containerNatWidth) / 2);
        this.actor.y = workArea.y + Math.floor((workArea.height - containerNatHeight) / 2);
    }

    _onTimeout() {
        // Animate hiding of the popup and destroy it afterwards
        Tweener.addTween(this._thumbnailsBox.actor, { opacity: 0.0,
                                                    time: ANIMATION_TIME,
                                                    transition: 'easeOutQuad',
                                                    onComplete: () => { this.destroy(); },
                                                    onCompleteScope: this });
        // Stop timer
        this._popupHideTimeoutId = 0;
        return GLib.SOURCE_REMOVE;
    }

    destroy() {
        // Stop timer if it was running
        if (this._popupHideTimeoutId) {
            Mainloop.source_remove(this._popupHideTimeoutId);
            this._popupHideTimeoutId = 0;
        }

        // Stop any ongoing animation and hide
        Tweener.removeTweens(this._thumbnailsBox.actor);
        this._thumbnailsBox.actor.opacity = 0;

        super.destroy();
    }
});

function enable() {
    originalWorkspaceSwitcherPopup = WorkspaceSwitcherPopup.WorkspaceSwitcherPopup;
    WorkspaceSwitcherPopup.WorkspaceSwitcherPopup = WorkspaceSwitcherPopupWithThumbnails;
}

function disable() {
    WorkspaceSwitcherPopup.WorkspaceSwitcherPopup = originalWorkspaceSwitcherPopup;
}

function init() {
    originalWorkspaceSwitcherPopup = WorkspaceSwitcherPopup.WorkspaceSwitcherPopup;
}

// 3.0 API backward compatibility
function main() {
    init();
    enable();
}
