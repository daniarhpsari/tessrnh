# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
from datetime import datetime, timedelta
import pytz
from odoo.exceptions import UserError, ValidationError


class pos_config(models.Model):
    _inherit = "pos.config"

    pos_config_promotional_scheme_ids = fields.Many2many("fal.pos.promotional.scheme", 'pos_config_promotional_scheme_rel', 'pos_config_id', 'promotional_id', string="Available Promotional Scheme")

    # @api.multi
    @api.constrains('pos_config_promotional_scheme_ids')
    def _check_pos_config_promotional_scheme_ids(self):
        for pos_config in self:
            for pos_config_promotional_scheme_id in pos_config.pos_config_promotional_scheme_ids:
                # Check if promotional scheme is in group AND not all the group scheme is on the config
                if pos_config_promotional_scheme_id.group_scheme and any(group_promotion_id.id not in pos_config.pos_config_promotional_scheme_ids.ids for group_promotion_id in self.env['fal.pos.promotional.scheme'].search([('group_scheme', '=', pos_config_promotional_scheme_id.group_scheme.id)])):
                    raise UserError(_(
                        'Error!\nNot all promotion scheme in group %s '
                        'is available here.') % (pos_config_promotional_scheme_id.group_scheme.name))
