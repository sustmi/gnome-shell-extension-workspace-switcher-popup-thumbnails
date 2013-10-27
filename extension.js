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

const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
const WorkspaceThumbnail = imports.ui.workspaceThumbnail;

const ANIMATION_TIME = 0.1;
const DISPLAY_TIMEOUT = 600;

function injectBeforeFunction(parent, name, func) {
		let original = parent[name];
    parent[name] = function() {
        let ret;
        ret = func.apply(this, arguments);
        if (original !== undefined) {
            ret = original.apply(this, arguments);
        }
        return ret;
    }
    return original;
}

function injectAfterFunction(parent, name, func) {
		let original = parent[name];
    parent[name] = function() {
        let ret;
        if (original !== undefined) {
            ret = original.apply(this, arguments);
        }
        ret = func.apply(this, arguments);
        return ret;
    }
    return original;
}

function replaceFunction(parent, name, func) {
    let original = parent[name];
    parent[name] = function() {
        return func.apply(this, arguments);
    }
    return original;
}

function restoreFunction(object, original, name) {
    if (original === undefined) {
        delete object[name];
    } else {
        object[name] = original;
    }
}

let workspaceSwitcherPopupInjections;

function resetState() {
    workspaceSwitcherPopupInjections = {};
}

function enable() {
    resetState();
    
    workspaceSwitcherPopupInjections['_init'] = replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, '_init', function() {
        this._workspaceSwitcherPopupThumbnailsExtension = {};
        
        this.actor = new St.Widget({ reactive: true,
                                     x: 0,
                                     y: 0,
                                     width: global.screen_width,
                                     height: global.screen_height,
                                     style_class: 'workspace-switcher-group' });
        Main.uiGroup.add_actor(this.actor);
        
        this._workspaceSwitcherPopupThumbnailsExtension.thumbnailsBox = new WorkspaceThumbnail.ThumbnailsBox();
        this._workspaceSwitcherPopupThumbnailsExtension.thumbnailsBox._createThumbnails();
        
        this.actor.add_actor(this._workspaceSwitcherPopupThumbnailsExtension.thumbnailsBox.actor);
        
        this._redisplay();
        
        this._workspaceSwitcherPopupThumbnailsExtension.timeoutId = Mainloop.timeout_add(DISPLAY_TIMEOUT, Lang.bind(this, this._onTimeout));
    });
    
    workspaceSwitcherPopupInjections['display'] = replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, 'display', function(direction, activeWorkspaceIndex) {
        this._redisplay();
        
        if (this._workspaceSwitcherPopupThumbnailsExtension.timeoutId != 0)
            Mainloop.source_remove(this._workspaceSwitcherPopupThumbnailsExtension.timeoutId);
        this._workspaceSwitcherPopupThumbnailsExtension.timeoutId = Mainloop.timeout_add(DISPLAY_TIMEOUT, Lang.bind(this, this._onTimeout));
    });
    
    workspaceSwitcherPopupInjections['_redisplay'] = replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, '_redisplay', function() {
        let workArea = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);
        
        let [containerMinHeight, containerNatHeight] = this._workspaceSwitcherPopupThumbnailsExtension.thumbnailsBox.actor.get_preferred_height(global.screen_width);
        let [containerMinWidth, containerNatWidth] = this._workspaceSwitcherPopupThumbnailsExtension.thumbnailsBox.actor.get_preferred_width(containerNatHeight);
        
        this.actor.x = workArea.x + Math.floor((workArea.width - containerNatWidth) / 2);
        this.actor.y = workArea.y + Math.floor((workArea.height - containerNatHeight) / 2);
    });
    
    workspaceSwitcherPopupInjections['_onTimeout'] = replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, '_onTimeout', function() {
        Mainloop.source_remove(this._workspaceSwitcherPopupThumbnailsExtension.timeoutId);
        this._workspaceSwitcherPopupThumbnailsExtension.timeoutId = 0;
        Tweener.addTween(this._workspaceSwitcherPopupThumbnailsExtension.thumbnailsBox.actor, { opacity: 0.0,
                                            time: ANIMATION_TIME,
                                            transition: 'easeOutQuad',
                                            onComplete: function() { this.destroy(); },
                                            onCompleteScope: this
                                           });
    });
    
    workspaceSwitcherPopupInjections['destroy'] = replaceFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, 'destroy', function() {
        if (this._workspaceSwitcherPopupThumbnailsExtension.timeoutId)
            Mainloop.source_remove(this._workspaceSwitcherPopupThumbnailsExtension.timeoutId);
        this._workspaceSwitcherPopupThumbnailsExtension.timeoutId = 0;

        this.emit('destroy');
    });

}

function disable() {
    for (let name in workspaceSwitcherPopupInjections) {
        restoreFunction(WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype, workspaceSwitcherPopupInjections[name], name);
    }
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

