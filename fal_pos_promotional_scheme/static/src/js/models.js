odoo.define('fal_pos_promotional_scheme.models', function (require) {
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');

    var core = require('web.core');
    var QWeb     = core.qweb;

    var utils = require('web.utils');
    var round_pr = utils.round_precision;

    var _t = core._t;

    models.load_fields("product.product", "is_promotional_item");

    models.load_models({
        model: 'fal.pos.promotional.scheme',
        fields: ['name', 'scheme_type', 'discount_percentage', 'discount_after_tax', 'product_id', 'product_uom_qty', 'price_unit', 'repeatable', 'active', 'auto_check', 'currency_id', 'parent_scheme', 'child_scheme', 'group_scheme'],
        domain: function(self) { return ['&', '&', ['id', 'in', self.config.pos_config_promotional_scheme_ids], ['active', '=', true],'|', '&', ['date_start', '<=', new moment().format("YYYY-MM-DD")], ['date_end', '>=', new moment().format("YYYY-MM-DD")], '&', ['date_start', '=', false], ['date_end', '=', false]]; },
        loaded: function (self, schemes) {
            self.schemes = schemes;
            self.scheme_by_id = {};
            for (var i = 0; i < schemes.length; i++) {
                schemes[i].scheme_rules = [];
                self.scheme_by_id[schemes[i].id] = schemes[i];
            }
        },
    });

    models.load_models({
        model: 'fal.pos.promotional.scheme.rule',
        fields: ['scheme_id', 'rule_type', 'currency_id', 'sale_total', 'product_id', 'product_uom_qty'],
        domain: function(self) { return [['scheme_id', 'in', _.pluck(self.schemes, 'id')]]; },
        loaded: function (self, scheme_rules) {
            self.scheme_rules = scheme_rules;
            self.scheme_rules_by_id = {};
            for (var i = 0; i < scheme_rules.length; i++) {
                self.scheme_rules_by_id[scheme_rules[i].id] = scheme_rules[i];
                var schemes = self.scheme_by_id[scheme_rules[i].scheme_id[0]];
                if (schemes) {
                    schemes.scheme_rules.push(scheme_rules[i]);
                    scheme_rules[i].scheme = schemes;
                }
            }
        },
    });

    var _super_posmodel = models.PosModel.prototype;
    models.PosModel = models.PosModel.extend({
        load_orders: function () {
            var self = this;
            this.the_first_load = true;
            _super_posmodel.load_orders.apply(this, arguments);
            this.the_first_load = false;
        },

    });

    var _super_order_line = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        initialize: function (attributes, options) {
            var self = this;
            _super_order_line.initialize.apply(this, arguments)
            this.scheme = this.scheme || false;
        },
        set_scheme: function(scheme){
            this.scheme = scheme;
            this.trigger('change',this);
        },
        get_scheme: function(scheme){
            return this.scheme;
        },
        export_as_JSON: function(){
            var json = _super_order_line.export_as_JSON.call(this);
            json.scheme = this.scheme.id;
            return json;
        },
        init_from_JSON: function(json){
            _super_order_line.init_from_JSON.apply(this,arguments);
            if (json.scheme){
                this.scheme = this.pos.scheme_by_id[json.scheme];
            }else{
                this.scheme = this.scheme || "";
            }
        },
        can_be_merged_with: function(orderline) {
            if (orderline.get_scheme() !== this.get_scheme()) {
                return false;
            } else {
                return _super_order_line.can_be_merged_with.apply(this,arguments);
            }
        },
        export_for_printing: function(){
            result = _super_order_line.export_for_printing.apply(this,arguments);
            if (this.get_scheme()){
                result['scheme_name'] = this.get_scheme().name
            }
            else{
                result['scheme_name'] = false
            }
            return result;
        },
    });

    var _super_order = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function (attributes, options) {
            var self = this;
            var res = _super_order.initialize.apply(this, arguments);
            this.set_skip_assert_promo(false)
            return res;
        },
        export_as_JSON: function(){
            var json = _super_order.export_as_JSON.call(this);
            json.skip_assert_promo = this.skip_assert_promo;
            return json;
        },
        init_from_JSON: function(json){
            _super_order.init_from_JSON.apply(this,arguments);
            this.skip_assert_promo = json.skip_assert_promo;
        },
        set_skip_assert_promo: function(skip_assert_promo){
            this.skip_assert_promo = skip_assert_promo;
        },
        get_skip_assert_promo: function(skip_assert_promo){
            return this.skip_assert_promo;
        },
        get_total_scheme: function() {
            return round_pr(this.orderlines.reduce((function(sum, orderLine) {
                return sum + (orderLine.get_unit_price() * (orderLine.get_scheme() != false ? 1 : 0) * orderLine.get_quantity());
            }), 0), this.pos.currency.rounding);
        },
        export_for_printing: function(){
            result = _super_order.export_for_printing.apply(this,arguments);

            result['total_before_scheme'] = this.get_total_with_tax() - this.get_total_scheme();
            result['total_scheme'] = this.get_total_scheme();
            return result
        },
        add_product: function(product, options){
            var self = this;
            if (!this.pos.the_first_load){
                if (product.is_promotional_item && this.pos.user.role != 'manager' && !this.pos.user.skip_assert_promo){
                    throw new Error('Cannot add promotional item');
                }
            }
            _super_order.add_product.apply(this, arguments);
        },
        // Check if Order are eligible for Promotional Scheme
        // If there is parent-child scheme, need to check the only best possible option.
        check_promotional_scheme: function(){
            var self = this;
            console.log("SSSSSSSSSSSSSSSsss")
            for (var i = 0; i < this.pos.schemes.length; i++) {
                if (this.pos.schemes[i].auto_check && this.pos.schemes[i].parent_scheme === false){
                    chained_scheme = [this.pos.schemes[i]]
                    current_scheme = this.pos.schemes[i]
                    while(current_scheme.child_scheme){
                        chained_scheme.push(this.pos.scheme_by_id[current_scheme.child_scheme[0]])
                        current_scheme = this.pos.scheme_by_id[current_scheme.child_scheme[0]]
                    }
                    for (var j = chained_scheme.length - 1; j >= 0; j--){
                        result = this.check_promotional_scheme_rule_satisfied(chained_scheme[j])
                        if (result){
                            this.apply_promotional_scheme(chained_scheme[j], result)
                            j = -1;
                        }
                    }
                }
            }
        },
        // Check if Promotion Scheme Rule Satisfied
        _check_promotional_scheme_rule_satisfied: function(scheme, pos_total_nett, pos_total_gross, map_product){
            var satisfied = true
            var qty = 0
            for (var i = 0; i < scheme.scheme_rules.length; i++){
                if (scheme.scheme_rules[i].rule_type == 'total_nett_sale'){
                    pos_total_nett -= scheme.scheme_rules[i].sale_total
                    if (pos_total_nett < 0){
                        satisfied = false
                    }
                }
                if (scheme.scheme_rules[i].rule_type == 'total_gross_sale'){
                    pos_total_gross -= scheme.scheme_rules[i].sale_total
                    if (pos_total_gross < 0){
                        satisfied = false
                    }
                }
                if (scheme.scheme_rules[i].rule_type == 'purchase_product'){
                    map_product[scheme.scheme_rules[i].product_id[0]] = map_product[scheme.scheme_rules[i].product_id[0]] - scheme.scheme_rules[i].product_uom_qty
                    if (map_product[scheme.scheme_rules[i].product_id[0]] < 0 || Number.isNaN(map_product[scheme.scheme_rules[i].product_id[0]])){
                        satisfied = false
                    }
                }
            }
            if (satisfied){
                if (scheme.scheme_type == 'product'){
                    qty += scheme.product_uom_qty
                }
                else if (scheme.scheme_type == 'discount'){
                    qty += scheme.discount_percentage
                }
            }
            return [satisfied, qty, pos_total_nett, pos_total_gross, map_product]
        },
        check_promotional_scheme_rule_satisfied: function(scheme){
            var qty = 0
            var pos_total_nett = this.get_total_without_tax()
            var pos_total_gross = this.get_total_with_tax()
            var lines    = this.get_orderlines();
            var map_product = []
            for (var i = 0; i < lines.length; i++){
                // Do not count promotional line
                if (!lines[i].get_scheme()){
                    map_product[lines[i].get_product().id] = map_product[lines[i].get_product().id] ? map_product[lines[i].get_product().id] + lines[i].get_quantity() : lines[i].get_quantity()
                }
            }
            if (scheme.repeatable){
                var possible = true
                while (possible){
                    result = this._check_promotional_scheme_rule_satisfied(scheme, pos_total_nett, pos_total_gross, map_product)
                    possible = result[0]
                    qty += result[1]
                    pos_total_nett = result[2]
                    pos_total_gross = result[3]
                    map_product = result[4]
                }
            }
            else{
                result = this._check_promotional_scheme_rule_satisfied(scheme, pos_total_nett, pos_total_gross, map_product)
                qty += result[1]
            }
            return qty
        },
        // Apply promo into orderline
        apply_promotional_scheme: function(scheme, qty){
            if (qty > 0){
                var lines    = this.get_orderlines();
                var product  = this.pos.db.get_product_by_id(this.pos.config.discount_product_id[0])
                // Check if current order already have the line that is from this scheme
                // or within same group scheme
                var i = 0;
                var initial_qty = 0;
                var scheme_line = false
                // Also check total value of orderline within the product rules
                scheme_rule_product = []
                for (var j = 0; j < scheme.scheme_rules.length; j++){
                    scheme_rule_product.push(scheme.scheme_rules[j].product_id[0])
                }
                // Total Orderline that is in scheme_rule_product
                total_rule_value = 0
                while ( i < lines.length ) {
                    line_group_scheme = false
                    if (lines[i].get_scheme().group_scheme){
                        line_group_scheme = lines[i].get_scheme().group_scheme[0]
                    }
                    scheme_group_scheme = false
                    if (scheme.group_scheme){
                        scheme_group_scheme = scheme.group_scheme[0]
                    }
                    if (lines[i].get_scheme() === scheme || (lines[i].get_scheme().id != undefined && line_group_scheme != false && scheme_group_scheme != false && line_group_scheme === scheme_group_scheme)) {
                        initial_qty = lines[i].get_quantity();
                        scheme_line = lines[i]
                    }
                    // Get total of orderline that is related to rules
                    if (scheme_rule_product.includes(lines[i].get_product().id)){
                        if (scheme.discount_after_tax){
                            total_rule_value += lines[i].get_price_with_tax()
                        }else{
                            total_rule_value += lines[i].get_price_without_tax()
                        }
                    }
                    i++;
                }
                // Round the total_rule_value
                total_rule_value = round_pr(total_rule_value, this.pos.currency.rounding);

                // If there is scheme line, just edit existing
                if (scheme_line){
                    // If Product. Need to manage qty & price
                    if (scheme.scheme_type == 'product'){
                        scheme_line.set_quantity(qty, true);
                        scheme_line.set_unit_price(scheme.price_unit);
                        scheme_line.set_scheme(scheme);
                    }
                    else{
                        if (product === undefined) {
                            this.pos.gui.show_popup('error', {
                                title : _t("No discount product found"),
                                body  : _t("The discount product seems misconfigured. Make sure it is flagged as 'Can be Sold' and 'Available in Point of Sale'."),
                            });
                            return;
                        }
                        // Value to discount is total price of the rules product
                        var discount = - scheme.discount_percentage / 100.0 * total_rule_value;

                        if( discount < 0 ){
                            scheme_line.set_unit_price(discount);
                            scheme_line.set_scheme(scheme);
                        }
                    }
                }else{
                    if (scheme.scheme_type == 'product'){
                        this.add_product(this.pos.db.product_by_id[scheme.product_id[0]], {quantity: qty, price: scheme.price_unit, extras: {scheme: scheme}});
                    }else{
                        if (product === undefined) {
                            this.pos.gui.show_popup('error', {
                                title : _t("No discount product found"),
                                body  : _t("The discount product seems misconfigured. Make sure it is flagged as 'Can be Sold' and 'Available in Point of Sale'."),
                            });
                            return;
                        }
                        // Value to discount is total price of the rules product
                        // If no product found in the rule, means it's global discount
                        var discount = 0
                        if (total_rule_value > 0){
                            discount = - scheme.discount_percentage / 100.0 * total_rule_value;
                        }else{
                            if (scheme.discount_after_tax){
                                discount = - scheme.discount_percentage / 100.0 * this.get_total_with_tax();
                            }else{
                                discount = - scheme.discount_percentage / 100.0 * this.get_total_without_tax();
                            }
                        }
                        this.add_product(product, { price: discount, extras: {scheme: scheme} });
                    }
                    this.get_last_orderline().set_scheme(scheme);
                }
            }
        }
    });
});
