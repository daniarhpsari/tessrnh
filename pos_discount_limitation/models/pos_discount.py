# -*- coding: utf-8 -*-
# © 2018-Today Aktiv Software (http://www.aktivsoftware.com).
# Part of AktivSoftware See LICENSE file for full copyright
# and licensing details.

from odoo import _, api, fields, models
from odoo.exceptions import UserError


class PosDiscount(models.Model):
    _name = "pos.discount.limitation"
    _rec_name = "group_id"
    _description = "POS Discount Limitation"

    group_id = fields.Many2one("res.groups", domain=[('category_id', 'ilike', 'Point of Sale')], required=True)
    pos_discount_limitation = fields.Float()

    @api.constrains("group_id")
    def _check_group(self):
        """
        If pos user groups already added discount then it'll raise UserError
        "Exists ! Already a Group exists in this name"
        Otherwise it'll add them.
        :return: UserError or None
        """

        group_id = self.env["pos.discount.limitation"].search(
            [("group_id", "=", self.group_id.id), ("id", "!=", self.id)]
        )
        if group_id:
            raise UserError(_("Exists ! Already a Group exists in this name"))
