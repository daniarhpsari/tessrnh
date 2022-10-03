# -*- coding: utf-8 -*-
# © 2018-Today Aktiv Software (http://www.aktivsoftware.com).
# Part of AktivSoftware See LICENSE file for full copyright
# and licensing details.

from odoo import api, fields, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    def _get_discount_product(self):
        """
        To fetch the Discount product for the add in pos discount in total price.
        :return: Discount Product
        """

        return self.env.ref("pos_discount_limitation.product_product_discount").id

    module_pos_discount = fields.Boolean(default=True)
    discount_product_id = fields.Many2one(
        "product.product", default=_get_discount_product
    )

    @api.onchange("company_id", "module_pos_discount")
    def _default_discount_product_id(self):
        """
        To override this method and set the default discount product in POS config.
        Based on the company_id and module_pos_discount Boolean property.
        If Boolean property is false then remove the discount product from POS config.
        if Boolean property is true then add the discount product from POS config

        On changes of company_id, it'll set the default discount_product_id.
        :return: None
        """
        res = super(PosConfig, self)._default_discount_product_id()
        product = self.env.ref(
            "point_of_sale.product_product_consumable", raise_if_not_found=False
        )
        self.discount_product_id = (
            product
            if self.module_pos_discount
               and product
               and (not product.company_id or product.company_id == self.company_id)
            else False
        )
        if self.module_pos_discount:
            self.discount_product_id = self.env.ref(
                "pos_discount_limitation.product_product_discount"
            ).id
        else:
            self.discount_product_id = False
        self.discount_pc = 0.0
        return res

    @api.model
    def check_user_group(self, pos_user, pc):
        """
        This method will chek pos session user and their groups, this will pos manager or pos user.
        Based on that group it'll findout this group maximum discount limit.
        if the user's group is discount is less then the applied discount the it'll return true
        if the user's group is discount is greater then the applied discount the it'll return disc_limit

        :param pos_user: current pos user
        :param pc: applied discount
        :return: True or discount limit
        """

        user = pos_user.get("user_id")[0]
        pos_user_rec = self.env["res.users"].browse(int(user))
        disc_limit = False
        if pos_user_rec.has_group("point_of_sale.group_pos_manager"):
            pos_discount_limitation_rec = self.env["pos.discount.limitation"].search(
                [("group_id", "=", self.env.ref("point_of_sale.group_pos_manager").id)]
            )
            disc_limit = pos_discount_limitation_rec.pos_discount_limitation
        elif pos_user_rec.has_group("point_of_sale.group_pos_user"):
            pos_discount_limitation_rec = self.env["pos.discount.limitation"].search(
                [("group_id", "=", self.env.ref("point_of_sale.group_pos_user").id)]
            )
            disc_limit = pos_discount_limitation_rec.pos_discount_limitation

        if pc:
            if pc > disc_limit:
                return {"disc_limit": disc_limit}
        return True
