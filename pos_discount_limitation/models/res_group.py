# -*- coding: utf-8 -*-
# © 2018-Today Aktiv Software (http://www.aktivsoftware.com).
# Part of AktivSoftware See LICENSE file for full copyright
# and licensing details.

from odoo import api, models


class ResGroups(models.Model):
    _inherit = "res.groups"

    @api.model
    def _name_search(
            self, name, args=None, operator="ilike", limit=100, name_get_uid=None
    ):
        """
        Override this method, and add the condition if context can find the is_pos_discount true value
        then this will show only the pos user category's group.

        This will restrict the group add the other groups. like. base user group.

        :param name: name of the search
        :param args: additional condition
        :param operator: string searching ilike
        :param limit: maximum 100 results
        :param name_get_uid: user id
        :return: filtered groups
        """

        context = self.env.context
        if context.get("is_pos_discount"):
            category_id = self.env.ref("base.module_category_sales_point_of_sale")
            if category_id:
                domain = [("category_id", "=", category_id.id)]
        else:
            domain = []
        res_groups = self._search(
            domain + args, limit=limit, access_rights_uid=name_get_uid
        )
        rtn = models.lazy_name_get(self.browse(res_groups))
        return rtn
