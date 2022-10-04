# -*- coding: utf-8 -*-
from odoo import api, fields, models, _


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    is_promotional_item = fields.Boolean("Promotional Item", default=False, help="Promotional Item")

# end of ProductTemplate()
