# -*- coding: utf-8 -*-
##############################################################################
#
#    TL Technology
#    Copyright (C) 2019 ­TODAY TL Technology (<https://www.posodoo.com>).
#    Odoo Proprietary License v1.0 along with this program.
#
##############################################################################
from odoo.http import request
from odoo.addons.bus.controllers.main import BusController
from odoo.addons.web.controllers.main import DataSet
from odoo import api, http, SUPERUSER_ID
from odoo.addons.web.controllers.main import ensure_db, Home, Session, WebClient
from odoo.addons.point_of_sale.controllers.main import PosController
import json
import logging
import werkzeug.utils

_logger = logging.getLogger(__name__)

class pos_controller(PosController):

    @http.route('/pos/web', type='http', auth='user')
    def pos_web(self, debug=False, **k):
        _logger.info('--> begin start pos session of user: %s' % request.env.user.login)
        session_info = request.env['ir.http'].session_info()
        server_version_info = session_info['server_version_info'][0]
        pos_sessions = None
        if server_version_info == 10:
            pos_sessions = request.env['pos.session'].search([
                ('state', '=', 'opened'),
                ('user_id', '=', request.session.uid),
                ('name', 'not like', '(RESCUE FOR')])
        if server_version_info in [11, 12]:
            pos_sessions = request.env['pos.session'].search([
                ('state', '=', 'opened'),
                ('user_id', '=', request.session.uid),
                ('rescue', '=', False)])
        if not pos_sessions:  # auto direct login odoo to pos
            if request.env.user.pos_config_id:
                request.env.user.pos_config_id.current_session_id = request.env['pos.session'].sudo(
                    request.env.user.id).create({
                    'user_id': request.env.user.id,
                    'config_id': request.env.user.pos_config_id.id,
                })
                pos_sessions = request.env.user.pos_config_id.current_session_id
                pos_sessions.action_pos_session_open()
        if not pos_sessions:
            return werkzeug.utils.redirect('/web#action=point_of_sale.action_client_pos_menu')
        pos_session = pos_sessions[0]
        pos_session.login()
        session_info['model_ids'] = {
            'product.product': {},
            'res.partner': {},
        }
        model_list = {
            'product.product': 'product_product',
            'res.partner': 'res_partner',
        }
        for object, table in model_list.items():
            request.env.cr.execute("select min(id) from %s" % table)
            min_ids = request.env.cr.fetchall()
            session_info['model_ids'][object]['min_id'] = min_ids[0][0] if min_ids and min_ids[0] else 1
            request.env.cr.execute("select max(id) from %s" % table)
            max_ids = request.env.cr.fetchall()
            session_info['model_ids'][object]['max_id'] = max_ids[0][0] if max_ids and max_ids[0] else 1
        context = {
            'session_info': json.dumps(session_info)
        }
        return request.render('point_of_sale.index', qcontext=context)