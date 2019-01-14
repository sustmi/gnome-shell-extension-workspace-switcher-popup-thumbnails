// ThumbnailsBox class is normally used to display workspace thumbnails
// in window overview (the bar on right after pressing SUPER key).
// This extension uses overriden variant that can be used even
// in workspaceSwitcherPopup (shown when using CTRL+ALT+UP or DOWN).
// For details of changes see the inline comments with diffs.

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
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Signals = imports.signals;
const St = imports.gi.St;

const Main = imports.ui.main;

const WorkspaceThumbnail = imports.ui.workspaceThumbnail;

const ThumbnailState = WorkspaceThumbnail.ThumbnailState;

const SETTINGS_SCHEMA = WorkspaceThumbnail.MUTTER_SCHEMA !== undefined
    ? WorkspaceThumbnail.MUTTER_SCHEMA
    : WorkspaceThumbnail.OVERRIDE_SCHEMA;

const ThumbnailsBox = new Lang.Class({
    Name: 'ThumbnailsBox',
    Extends: WorkspaceThumbnail.ThumbnailsBox,

// Method copy-pasted from GNOME Shell v3.30.2 (gnome-shell/js/ui/workspaceThumbnail.js)
    _init: function() {
        this.actor = new Shell.GenericContainer({ reactive: true,
            style_class: 'workspace-thumbnails',
            request_mode: Clutter.RequestMode.WIDTH_FOR_HEIGHT });
        this.actor.connect('get-preferred-width', this._getPreferredWidth.bind(this));
        this.actor.connect('get-preferred-height', this._getPreferredHeight.bind(this));
        this.actor.connect('allocate', this._allocate.bind(this));
        this.actor._delegate = this;

        let indicator = new St.Bin({ style_class: 'workspace-thumbnail-indicator' });

        // We don't want the indicator to affect drag-and-drop
        Shell.util_set_hidden_from_pick(indicator, true);

        this._indicator = indicator;
        this.actor.add_actor(indicator);

        this._dropWorkspace = -1;
        this._dropPlaceholderPos = -1;
        this._dropPlaceholder = new St.Bin({ style_class: 'placeholder' });
        this.actor.add_actor(this._dropPlaceholder);
        this._spliceIndex = -1;

        this._targetScale = 0;
        this._scale = 0;
        this._pendingScaleUpdate = false;
        this._stateUpdateQueued = false;
        this._animatingIndicator = false;
        this._indicatorY = 0; // only used when _animatingIndicator is true

        this._stateCounts = {};
        for (let key in ThumbnailState)
            this._stateCounts[ThumbnailState[key]] = 0;

        this._thumbnails = [];

        this.actor.connect('button-press-event', () => Clutter.EVENT_STOP);
        this.actor.connect('button-release-event', this._onButtonRelease.bind(this));
        this.actor.connect('touch-event', this._onTouchEvent.bind(this));

// PATCH: Do not connect to signals that make sense only in the right panel
// in window overview
/*-        Main.overview.connect('showing',*/
/*-            this._createThumbnails.bind(this));*/
/*-        Main.overview.connect('hidden',*/
/*-            this._destroyThumbnails.bind(this));*/
/*-
/*-        Main.overview.connect('item-drag-begin',*/
/*-            this._onDragBegin.bind(this));*/
/*-        Main.overview.connect('item-drag-end',*/
/*-            this._onDragEnd.bind(this));*/
/*-        Main.overview.connect('item-drag-cancelled',*/
/*-            this._onDragCancelled.bind(this));*/
/*-        Main.overview.connect('window-drag-begin',*/
/*-            this._onDragBegin.bind(this));*/
/*-        Main.overview.connect('window-drag-end',*/
/*-            this._onDragEnd.bind(this));*/
/*-        Main.overview.connect('window-drag-cancelled',*/
/*-            this._onDragCancelled.bind(this));*/

// PATCH: Use right schema_id based on GNOME Shell version
/*-        this._settings = new Gio.Settings({ schema_id: MUTTER_SCHEMA });*/
        this._settings = new Gio.Settings({ schema_id: SETTINGS_SCHEMA });
        this._settings.connect('changed::dynamic-workspaces',
            this._updateSwitcherVisibility.bind(this));

        Main.layoutManager.connect('monitors-changed', () => {
            this._destroyThumbnails();
// PATCH: Create thumbnails on "monitors-changed" even when not in overview mode
/*-            if (Main.overview.visible)*/
                this._createThumbnails();
        });

        this._switchWorkspaceNotifyId = 0;
        this._nWorkspacesNotifyId = 0;
        this._syncStackingId = 0;
        this._workareasChangedId = 0;
    },

// Method copy-pasted from GNOME Shell v3.30.2 (gnome-shell/js/ui/workspaceThumbnail.js)
    _ensurePorthole: function() {
// PATCH: Allocate porthole even when not in overview mode
/*-        if (!Main.layoutManager.primaryMonitor || !Main.overview.visible)*/
/*+*/   if (!Main.layoutManager.primaryMonitor)
            return false;

        if (!this._porthole)
            this._porthole = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);

        return true;
    },

});
Signals.addSignalMethods(ThumbnailsBox.prototype);
