# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError
from odoo.addons import decimal_precision as dp


class SchemeProgramGroup(models.Model):
    _name = 'fal.pos.promotional.scheme.group'

    name = fields.Char("Name", required=True)


class SchemeProgram(models.Model):
    _name = 'fal.pos.promotional.scheme'

    name = fields.Char("Name", required=True)
    scheme_type = fields.Selection(
                        [('product', 'Product'),
                         ('discount', 'Discount')], required=True)
    discount_percentage = fields.Float("Discount (%)")
    discount_after_tax = fields.Boolean("Discount After Tax")
    product_id = fields.Many2one('product.product', string="Product", domain="[('sale_ok', '=', 1), ('available_in_pos', '=', 1)]")
    product_uom_qty = fields.Float(string='Quantity', digits=dp.get_precision('Product Unit of Measure'), default=1.0)
    currency_id = fields.Many2one("res.currency", default=lambda self: self.env.user.company_id.currency_id, string="Currency")
    price_unit = fields.Monetary('Unit Price', required=True, digits=dp.get_precision('Product Price'), default=0.0)
    active = fields.Boolean('Active', default=True)
    repeatable = fields.Boolean("Allow Multiple")
    rule_ids = fields.One2many('fal.pos.promotional.scheme.rule', 'scheme_id', string="Rule(s)", required=True, copy=True)
    groups_id = fields.Many2many('res.groups', 'res_groups_promotional_rel', 'uid', 'gid', string='Groups')
    auto_check = fields.Boolean('Auto Check', default=False)
    group_scheme = fields.Many2one('fal.pos.promotional.scheme.group', string="Group Scheme")
    parent_scheme = fields.Many2one('fal.pos.promotional.scheme', string="Parent Scheme")
    child_scheme = fields.Many2one('fal.pos.promotional.scheme', string="Child Scheme")
    pos_config_promotional_scheme_ids = fields.Many2many("pos.config", 'pos_config_promotional_scheme_rel', 'promotional_id', 'pos_config_id', string="Available on PoS")
    date_start = fields.Date("Date Start")
    date_end = fields.Date("Date End")
    product_ids = fields.Many2many('product.template', string='Product')
    categ_ids = fields.Many2many('product.category', string='Categ')
    # product_brand_ids = fields.Many2many('product.brand.ept', string='Brand')

    @api.model
    def create(self, vals):
        if not vals.get('rule_ids', False):
            raise UserError(_('Configuration error!\nPromotional Scheme'
                                  ' Need to have Rule(s).'))
        _super = super(SchemeProgram, self)
        return _super.create(vals)

    # @api.multi
    def write(self, values):
        result = super(SchemeProgram, self).write(values)
        if not self.rule_ids:
            raise UserError(_('Configuration error!\nPromotional Scheme'
                                  ' Need to have Rule(s).'))
        return result


class SchemeProgramRule(models.Model):
    _name = 'fal.pos.promotional.scheme.rule'

    scheme_id = fields.Many2one('fal.pos.promotional.scheme', 'Scheme')
    rule_type = fields.Selection(
                        [('total_nett_sale', 'Nett Total Sale'),
                         ('total_gross_sale', 'Gross Total Sale'),
                         ('purchase_product', 'Purchase Product')], required=True)
    currency_id = fields.Many2one("res.currency", default=lambda self: self.env.user.company_id.currency_id, string="Currency")
    sale_total = fields.Monetary(string='Total')
    product_id = fields.Many2one('product.product', string="Product", domain="[('sale_ok', '=', 1), ('available_in_pos', '=', 1)]")
    product_uom_qty = fields.Float(string='Quantity', digits=dp.get_precision('Product Unit of Measure'), default=0.0)
    product_ids = fields.Many2many('product.template', string='Product')
    categ_ids = fields.Many2many('product.category', string='Categ')
    # product_brand_ids = fields.Many2many('product.brand.ept', string='Brand')


    _sql_constraints = [
        ('check_sale_total_nett', "CHECK (rule_type = 'total_nett_sale' and sale_total > 0 or rule_type != 'total_nett_sale')", "Total sale rule's total value cannot be 0"),
        ('check_sale_total_gross', "CHECK (rule_type = 'total_gross_sale' and sale_total > 0 or rule_type != 'total_gross_sale')", "Total sale rule's total value cannot be 0"),
        ('check_product_rule', "CHECK (rule_type = 'purchase_product' and purchase_product != False and product_uom_qty > 0 or rule_type != 'purchase_product')", "Product must be filled for Purchase Product Rules")
    ]
