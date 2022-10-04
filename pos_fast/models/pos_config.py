# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
import odoo
import logging
from odoo.exceptions import UserError
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
import json

try:
    to_unicode = unicode
except NameError:
    to_unicode = str

_logger = logging.getLogger(__name__)


class pos_config(models.Model):
    _inherit = "pos.config"

    required_reinstall_cache = fields.Boolean(
        'Required Reinstall Cache',
        default=0,
        help='Check to field if you need when pos session start,\n'
             ' auto reinstall cache')
    allow_sync_direct = fields.Boolean(
        'Allow sync Direct Backend',
        default=0,
        help='If active, all event update of Products, Customers auto sync to POS Session Online \n'
             'If your backend import datas or have big changes Customers/Products \n'
             'All event sync to POS Online will required have loading times, may be slow action sale of POS session\n'
             'PLease made sure it before active this future')

    @api.multi
    def update_required_reinstall_cache(self):
        return self.write({'required_reinstall_cache': False})

    @api.multi
    def reinstall_database(self):
        ###########################################################################################################
        # new field append :
        #                    - update param
        #                    - remove logs datas
        #                    - remove cache
        #                    - reload pos
        #                    - reinstall pos data
        # reinstall data button:
        #                    - remove all param
        #                    - pos start save param
        #                    - pos reinstall with new param
        # refresh call logs:
        #                    - get fields domain from param
        #                    - refresh data with new fields and domain
        ###########################################################################################################
        parameters = self.env['ir.config_parameter'].sudo().search([('key', 'in',
                                                                     ['product.product', 'res.partner',
                                                                      'account.invoice',
                                                                      'account.invoice.line', 'pos.order',
                                                                      'pos.order.line',
                                                                      'sale.order', 'sale.order.line'])])
        if parameters:
            parameters.sudo().unlink()
        self.env['pos.cache.database'].sudo().search([]).unlink()
        self.env['pos.call.log'].sudo().search([]).unlink()
        self.env.cr.execute("DELETE FROM pos_cache_database")
        self.env.cr.execute("DELETE FROM pos_call_log")
        for config in self:
            configs = self.search([('id', '=', config.id)])
            configs.write({'required_reinstall_cache': True})
        self.env.cr.commit()
        return {
            'type': 'ir.actions.act_url',
            'url': '/pos/web/',
            'target': 'self',
        }
