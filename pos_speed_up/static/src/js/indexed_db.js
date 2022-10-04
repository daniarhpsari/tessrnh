/*
* @Author: D.Jane
* @Email: jane.odoo.sp@gmail.com
*/
odoo.define('pos_speed_up.indexedDB', function (require) {
    "use strict";

    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

    if (!indexedDB) {
        window.alert("Your browser doesn't support a stable version of IndexedDB.")
    }

    var db_name = 'pos';

    var exports = {
        open_db: function () {
            var request = indexedDB.open(db_name, 1);

            request.onerror = function (ev) {
                console.log(ev);
            };

            request.onupgradeneeded = function (ev) {
                var db = ev.target.result;
                db.createObjectStore('customers', {keyPath: "id"});
                db.createObjectStore('products', {keyPath: "id"});
            };
            return request;
        },
        get_object_store: function (_name, ev) {
            var db = ev.target.result;
            return db.transaction([_name], "readwrite").objectStore(_name);
        },
        save: function (_name, items) {
            var self = this;
            this.open_db().onsuccess = function (ev) {
                var store = self.get_object_store(_name, ev);
                localStorage.setItem(_name, 'cached');

                _.each(items, function (item) {
                    store.put(item).onerror = function () {
                        localStorage.setItem(_name, null);
                    }
                });
            }
        },
        is_cached: function (_name) {
            return localStorage.getItem(_name) === 'cached';
        },
        get: function (_name) {
            var self = this;
            var done = new $.Deferred();
            this.open_db().onsuccess = function (ev) {
                var store = self.get_object_store(_name, ev);
                var get = store.getAll();
                get.onsuccess = function (ev) {
                    var items = ev.target.result || [];
                    done.resolve(items);
                };

                get.onerror = function (error) {
                    done.reject(error);
                };
            };
            return done.promise();
        },
        optimize_data_change: function (create_ids, delete_ids, disable_ids) {
            var new_create_ids = create_ids.filter(function (id) {
                return delete_ids.indexOf(id) === -1 && disable_ids.indexOf(id) === -1;
            });

            return {
                'create': new_create_ids,
                'delete': delete_ids.concat(disable_ids)
            }
        },
        order_by_in_place: function (objects, fields, type) {
            var compare_esc = function (a, b) {
                for (var i = 0; i < fields.length; i++) {
                    var field = fields[i];

                    var a_field = a[field];
                    var b_field = b[field];

                    if (a_field == false || a_field == undefined) {
                        a_field = String.fromCharCode(65000);
                    }

                    if (b_field == false || b_field == undefined) {
                        b_field = String.fromCharCode(65000);
                    }

                    if (a_field > b_field) {
                        return 1;
                    }
                    if (a_field < b_field) {
                        return -1;
                    }
                }
                return 0;
            };

            var compare_desc = function (a, b) {
                for (var i = 0; i < fields.length; i++) {
                    var field = fields[i];

                    var a_field = a[field];
                    var b_field = b[field];

                    if (a_field == false || a_field == undefined) {
                        a_field = String.fromCharCode(65000);
                    }

                    if (b_field == false || b_field == undefined) {
                        b_field = String.fromCharCode(65000);
                    }

                    if (a_field > b_field) {
                        return -1;
                    }
                    if (a_field < b_field) {
                        return 1;
                    }
                }
                return 0;
            };

            if (type === 'esc') {
                objects.sort(compare_esc);
            } else if (type === 'desc') {
                objects.sort(compare_desc);
            }
        }
    };

    return exports;
});
