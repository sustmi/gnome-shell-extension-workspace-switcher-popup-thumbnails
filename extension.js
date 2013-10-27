// Show workspace thumbnails when switching between workspaces
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

const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const St = imports.gi.St;

const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MonkeyPatch = Me.imports.monkeyPatch;

const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
const WorkspaceThumbnail = imports.ui.workspaceThumbnail;

const ANIMATION_TIME = 0.1;
const DISPLAY_TIMEOUT = 600;

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
                                     x: 0,
                                     y: 0,
                                     width: global.screen_width,
                                     height: global.screen_height,
                                     style_class: 'workspace-switcher-group' });
        Main.uiGroup.add_actor(this.actor);
        
        ext.thumbnailsBox = new WorkspaceThumbnail.ThumbnailsBox();
        ext.thumbnailsBox._createThumbnails();
        ext.thumbnailsBox._background.set_style('border: 1px solid rgba(128, 128, 128, 0.4); \
                                                 border-radius: 9px; \
                                                 padding: 11px;');
        
        this.actor.add_actor(ext.thumbnailsBox.actor);
        
        this._redisplay();
        
        ext.timeoutId = Mainloop.timeout_add(DISPLAY_TIMEOUT, Lang.bind(this, this._onTimeout));
    });
    
    workspaceSwitcherPopupInjections['display'] = MonkeyPatch.replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, 'display', function(direction, activeWorkspaceIndex) {
        let ext = this._workspaceSwitcherPopupThumbnailsExtension;
        
        this._redisplay();
        
        if (ext.timeoutId != 0)
            Mainloop.source_remove(ext.timeoutId);
        ext.timeoutId = Mainloop.timeout_add(DISPLAY_TIMEOUT, Lang.bind(this, this._onTimeout));
    });
    
    workspaceSwitcherPopupInjections['_redisplay'] = MonkeyPatch.replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, '_redisplay', function() {
        let ext = this._workspaceSwitcherPopupThumbnailsExtension;
				
        let workArea = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);
        
        let [containerMinHeight, containerNatHeight] = ext.thumbnailsBox.actor.get_preferred_height(global.screen_width);
        let [containerMinWidth, containerNatWidth] = ext.thumbnailsBox.actor.get_preferred_width(containerNatHeight);
        
        this.actor.x = workArea.x + Math.floor((workArea.width - containerNatWidth) / 2);
        this.actor.y = workArea.y + Math.floor((workArea.height - containerNatHeight) / 2);
    });
    
    workspaceSwitcherPopupInjections['_onTimeout'] = MonkeyPatch.replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, '_onTimeout', function() {
        let ext = this._workspaceSwitcherPopupThumbnailsExtension;
        
        Mainloop.source_remove(ext.timeoutId);
        ext.timeoutId = 0;
        Tweener.addTween(ext.thumbnailsBox.actor, { opacity: 0.0,
                                                    time: ANIMATION_TIME,
                                                    transition: 'easeOutQuad',
                                                    onComplete: function() { this.destroy(); },
                                                    onCompleteScope: this });
    });
    
    workspaceSwitcherPopupInjections['destroy'] = MonkeyPatch.replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, 'destroy', function() {
        let ext = this._workspaceSwitcherPopupThumbnailsExtension;
        
        if (ext.timeoutId)
            Mainloop.source_remove(ext.timeoutId);
        ext.timeoutId = 0;

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

