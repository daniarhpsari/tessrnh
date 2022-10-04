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
        get_object_store: function (_name) {
            var done = new $.Deferred();

            var request = indexedDB.open(db_name, 1);

            request.onerror = function (ev) {
                done.reject(ev);
            };

            request.onupgradeneeded = function (ev) {
                var db = ev.target.result;
                db.createObjectStore('customers', {keyPath: "id"});
                db.createObjectStore('products', {keyPath: "id"});
            };

            request.onsuccess = function (ev) {
                var db = ev.target.result;

                var transaction = db.transaction([_name], "readwrite");

                // transaction.oncomplete = function () {
                //     db.close();
                // };

                if (!transaction) {
                    done.reject(new Error('Cannot create transaction with ' + _name));
                }

                transaction.oncomplete = function(ev) {
                    console.log('t-dkm-complete', ev);
                };

                transaction.onabort = function (ev) {
                    console.log('t-dkm-onabort', ev);
                };

                transaction.onerror = function (ev) {
                    console.log('t-dkm-onerror', ev);
                };

                var store = transaction.objectStore(_name);

                if (!store) {
                    done.reject(new Error('Cannot get object store with ' + _name));
                }

                var rq = store.add({id: 0, name: 'dkm'});

                rq.onsuccess = function (ev) {
                    console.log('vcl-success', ev);
                };

                done.resolve(store);
            };

            return done.promise();
        },
        save: function (_name, items) {
            $.when(this.get_object_store(_name))
                .done(function (store) {
                    console.log(store);
                    // localStorage.setItem(_name, 'cached');
                    var x = store.add({id: 1, name: 'dkm'});
                    x.onerror = function (ev) {
                        console.log(ev);
                    };
                    x.onsuccess = function (ev) {
                        console.log(ev);
                    };
                    console.log('done');
                    // _.each(items, function (item) {
                    //     console.log(item);
                    //     store.put(item).onerror = function (ev) {
                    //         console.log(ev);
                    //         localStorage.setItem(_name, null);
                    //     }
                    // });
                })
                .fail(function (error) {
                    console.log(error);
                });
        },
        is_cached: function (_name) {
            return localStorage.getItem(_name) === 'cached';
        },
        get: function (_name) {
            var done = new $.Deferred();
            $.when(this.get_object_store(_name))
                .done(function (store) {
                    var request = store.getAll();

                    request.onsuccess = function (ev) {
                        var items = ev.target.result || [];
                        done.resolve(items);
                    };

                    request.onerror = function (error) {
                        done.reject(error);
                    };
                })
                .fail(function (error) {
                    done.reject(error);
                });
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
                for(var i = 0; i < fields.length; i ++) {
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
                for(var i = 0; i < fields.length; i ++) {
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
