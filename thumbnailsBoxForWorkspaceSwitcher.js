// ThumbnailsBox class is normally used to display workspace thumbnails
// in window overview (the bar on right after pressing SUPER key).
// This extension uses overridden variant that can be used even
// in workspaceSwitcherPopup (shown when using CTRL+ALT+UP or DOWN).

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

const GObject = imports.gi.GObject;
const Main = imports.ui.main;

const WorkspaceThumbnail = imports.ui.workspaceThumbnail;

var ThumbnailsBoxForWorkspaceSwitcher = GObject.registerClass(
class ThumbnailsBoxForWorkspaceSwitcher extends WorkspaceThumbnail.ThumbnailsBox {
    _init() {
        super._init(...arguments);

        // Revert the destruction of thumbnails when windows overview is hidden
        Main.overview.connect('hidden', this._createThumbnails.bind(this));

        // Create thumbnails on "monitors-changed" even when not in overview mode
        Main.layoutManager.connect('monitors-changed', () => {
            if (!Main.overview.visible)
                this._createThumbnails();
        });
    }
});
