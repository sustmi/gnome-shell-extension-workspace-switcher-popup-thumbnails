// Overriden ThumbnailsBox class from Gnome Shell
// Added support for disconnecting signals

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
const OVERRIDE_SCHEMA = WorkspaceThumbnail.OVERRIDE_SCHEMA;

const ThumbnailsBox = new Lang.Class({
    Name: 'ThumbnailsBox',
    Extends: WorkspaceThumbnail.ThumbnailsBox,

    _init: function() {
        this.actor = new Shell.GenericContainer({ reactive: true,
                                                  style_class: 'workspace-thumbnails',
                                                  request_mode: Clutter.RequestMode.WIDTH_FOR_HEIGHT });
        this.actor.connect('get-preferred-width', Lang.bind(this, this._getPreferredWidth));
        this.actor.connect('get-preferred-height', Lang.bind(this, this._getPreferredHeight));
        this.actor.connect('allocate', Lang.bind(this, this._allocate));
        this.actor._delegate = this;

        // When we animate the scale, we don't animate the requested size of the thumbnails, rather
        // we ask for our final size and then animate within that size. This slightly simplifies the
        // interaction with the main workspace windows (instead of constantly reallocating them
        // to a new size, they get a new size once, then use the standard window animation code
        // allocate the windows to their new positions), however it causes problems for drawing
        // the background and border wrapped around the thumbnail as we animate - we can't just pack
        // the container into a box and set style properties on the box since that box would wrap
        // around the final size not the animating size. So instead we fake the background with
        // an actor underneath the content and adjust the allocation of our children to leave space
        // for the border and padding of the background actor.
        this._background = new St.Bin({ style_class: 'workspace-thumbnails-background' });

        this.actor.add_actor(this._background);

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

        this.actor.connect('button-press-event', function() { return true; });
        this.actor.connect('button-release-event', Lang.bind(this, this._onButtonRelease));

        this._settings = new Gio.Settings({ schema: OVERRIDE_SCHEMA });
        this._dynamicWorkspacesId = this._settings.connect('changed::dynamic-workspaces',
            Lang.bind(this, this._updateSwitcherVisibility));
    },
    
    destroy: function () {
        this.actor.destroy();
        for (let i in this._signals) {
            Main.overview.disconnect(this._signals[i]);
        }
        this._settings.disconnect(this._dynamicWorkspacesId);
        
        this.emit('destroy');
    }
    
});
Signals.addSignalMethods(ThumbnailsBox.prototype);
