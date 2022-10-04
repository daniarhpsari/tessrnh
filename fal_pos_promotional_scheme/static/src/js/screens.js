odoo.define('fal_pos_promotional_scheme.screens', function (require) {
"use strict";

var screens = require('point_of_sale.screens');
var core = require('web.core');
var utils = require('web.utils');

var rpc = require('web.rpc');

var QWeb     = core.qweb;

var _t = core._t;

var PromoSchemeButton = screens.ActionButtonWidget.extend({
    template: 'PromoSchemeButton',
    button_click: function(){
        var self = this;
        var order  = this.pos.get_order();
        if (order){
            var list = [];
            for (var i = 0; i < this.pos.schemes.length; i++) {
                list.push({
                    label: this.pos.schemes[i].name,
                    item:  this.pos.schemes[i],
                });
            }
            list.push({
                label: _t('Cancel all Scheme'),
                item:  'cancel_scheme',
            });
            this.gui.show_popup('selection',{
                'title': _t('Select a promotional scheme'),
                'list': list,
                'confirm': function(scheme){
                    if (scheme != 'cancel_scheme'){
                        var result = order.check_promotional_scheme_rule_satisfied(scheme);
                        if (result){
                            order.apply_promotional_scheme(scheme, result)
                        }else{
                            self.gui.show_popup('error',{
                                'title': _t('Error: Cannot apply the promo'),
                                'body': _t("Sorry, this order doesn't qualify for the promotional scheme. If you are sure that this should be possible, please contact the responsible manager."),
                            });
                        }
                    } else {
                        self.gui.show_popup('confirm',{
                            'title': _t('Destroy All Scheme?'),
                            'body': _t('You will lose all orderline that is based on promotional scheme'),
                            confirm: function(){
                                var scheme_lines = []
                                var orderlines = order.get_orderlines()
                                for (var i = 0; i < orderlines.length; i++){
                                    if (orderlines[i].get_scheme()){
                                        scheme_lines.push(orderlines[i])
                                    }
                                }
                                // When deleting do not check for scheme
                                order.set_skip_assert_promo(true)
                                for (var i = 0; i < scheme_lines.length; i++){
                                    order.remove_orderline(scheme_lines[i]);
                                }
                                order.set_skip_assert_promo(false)
                            },
                        });
                    }
                },
            });
        }
    },
});

screens.define_action_button({
    'name': 'promoscheme',
    'widget': PromoSchemeButton,
    'condition': function(){
        return true;
    },
});

screens.OrderWidget.include({
    update_summary: function(){
        this._super();
        var order = this.pos.get_order();
        // Try to check all Promotional Scheme
        if (order.get_skip_assert_promo() == false){
            order.set_skip_assert_promo(true);
            order.check_promotional_scheme();
            order.set_skip_assert_promo(false);
        }
    },
    // Can't Edit Scheme Line
    set_value: function(val) {
        var order = this.pos.get_order();
        if (order.get_selected_orderline()) {
            if (order.get_selected_orderline().get_scheme() != false){
                this.gui.show_popup('error',{
                    'title': _t("User Error"),
                    'body':  _t("Cannot edit Scheme Line. Please use 'Cancel All Scheme' button inside Promotion menu"),
                });
            }else{
                this._super(val);
            }
        }
    },
});

// Do not show Promo item on List of item
screens.ProductListWidget.include({
    renderElement: function() {
        var el_str  = QWeb.render(this.template, {widget: this});
        var el_node = document.createElement('div');
            el_node.innerHTML = el_str;
            el_node = el_node.childNodes[1];

        if(this.el && this.el.parentNode){
            this.el.parentNode.replaceChild(el_node,this.el);
        }
        this.el = el_node;

        var list_container = el_node.querySelector('.product-list');
        for(var i = 0, len = this.product_list.length; i < len; i++){
            if (!this.product_list[i].is_promotional_item){
                var product_node = this.render_product(this.product_list[i]);
                product_node.addEventListener('click',this.click_product_handler);
                list_container.appendChild(product_node);
            }
        }
    },
});

});