// Helper functions for monkey patching
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
