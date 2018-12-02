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

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const St = imports.gi.St;

const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MonkeyPatch = Me.imports.monkeyPatch;

const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
const ThumbnailsBox = Me.imports.thumbnailsBox;

const ANIMATION_TIME = WorkspaceSwitcherPopup.ANIMATION_TIME;
const DISPLAY_TIMEOUT = WorkspaceSwitcherPopup.DISPLAY_TIMEOUT;

let workspaceSwitcherPopupInjections;

function resetState() {
    workspaceSwitcherPopupInjections = {};
}

function enable() {
    resetState();
    
    WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype._workspaceSwitcherPopupThumbnailsExtension = {};
    
    workspaceSwitcherPopupInjections['_init'] = MonkeyPatch.replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, '_init', function() {
        let ext = this._workspaceSwitcherPopupThumbnailsExtension;
        
        this.actor = new St.Widget({ reactive: true,
                                     style_class: 'workspace-switcher-popup-thumbnails-extension' });
        Main.uiGroup.add_actor(this.actor);

        ext.thumbnailsBox = new ThumbnailsBox.ThumbnailsBox();
        ext.thumbnailsBox._createThumbnails();

        this.actor.add_actor(ext.thumbnailsBox.actor);
        
        this._redisplay();
        
        ext.popupHideTimeoutId = Mainloop.timeout_add(DISPLAY_TIMEOUT, Lang.bind(this, this._onTimeout));
    });
    
    workspaceSwitcherPopupInjections['display'] = MonkeyPatch.replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, 'display', function(direction, activeWorkspaceIndex) {
        let ext = this._workspaceSwitcherPopupThumbnailsExtension;
        
        this._redisplay();

        // Restart timeout
        if (ext.popupHideTimeoutId)
            Mainloop.source_remove(ext.popupHideTimeoutId);
        ext.popupHideTimeoutId = Mainloop.timeout_add(DISPLAY_TIMEOUT, Lang.bind(this, this._onTimeout));
    });
    
    workspaceSwitcherPopupInjections['_redisplay'] = MonkeyPatch.replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, '_redisplay', function() {
        let ext = this._workspaceSwitcherPopupThumbnailsExtension;

        // Stop the hiding animation if the popup should be redisplayed
        Tweener.removeTweens(ext.thumbnailsBox.actor);
        ext.thumbnailsBox.actor.opacity = 255;

        // Position thumbnailsBox into center of the window
        let workArea = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);
        
        let [containerMinHeight, containerNatHeight] = ext.thumbnailsBox.actor.get_preferred_height(global.screen_width);
        let [containerMinWidth, containerNatWidth] = ext.thumbnailsBox.actor.get_preferred_width(containerNatHeight);

        this.actor.x = workArea.x + Math.floor((workArea.width - containerNatWidth) / 2);
        this.actor.y = workArea.y + Math.floor((workArea.height - containerNatHeight) / 2);
    });
    
    workspaceSwitcherPopupInjections['_onTimeout'] = MonkeyPatch.replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, '_onTimeout', function() {
        let ext = this._workspaceSwitcherPopupThumbnailsExtension;

        // Animate hiding of the popup and destroy it afterwards
        Tweener.addTween(ext.thumbnailsBox.actor, { opacity: 0.0,
                                                    time: ANIMATION_TIME,
                                                    transition: 'easeOutQuad',
                                                    onComplete: function() { this.destroy(); },
                                                    onCompleteScope: this });
        // Stop timer
        ext.popupHideTimeoutId = 0;
        return false;
    });
    
    workspaceSwitcherPopupInjections['destroy'] = MonkeyPatch.replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, 'destroy', function() {
        let ext = this._workspaceSwitcherPopupThumbnailsExtension;

        // Stop timer if it was running
        if (ext.popupHideTimeoutId) {
            Mainloop.source_remove(ext.popupHideTimeoutId);
            ext.popupHideTimeoutId = 0;
        }

        // Stop any ongoing animation
        Tweener.removeTweens(ext.thumbnailsBox.actor);
        
        ext.thumbnailsBox._destroyThumbnails();
        this.actor.destroy();

        this.emit('destroy');
    });

}

function disable() {
    for (let name in workspaceSwitcherPopupInjections) {
        MonkeyPatch.restoreFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, workspaceSwitcherPopupInjections[name], name);
    }
    
    delete WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype._workspaceSwitcherPopupThumbnailsExtension;
    
    resetState();
}

function init() {
    // Stateless
}

// 3.0 API backward compatibility
function main() {
    init();
    enable();
}
