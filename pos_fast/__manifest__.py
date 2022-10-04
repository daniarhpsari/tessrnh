# -*- coding: utf-8 -*-
##############################################################################
#
#    TL Technology
#    Copyright (C) 2019 ­TODAY TL Technology (<https://www.posodoo.com>).
#    Odoo Proprietary License v1.0 along with this program.
#
##############################################################################
{
    'name': 'POS Speed Up, Big Datas',
    'version': '8.7',
    'category': 'Point of Sale',
    'sequence': 0,
    'author': 'TL Technology',
    'website': 'http://posodoo.com',
    'price': '100',
    'description': 'Support Big Datas Products, Customers \n'
                   'Default POS session start session, take long times for loaded all customers and products\n'
                   'This module can help your pos sessions starting POS very very fast\n'
                   'Only few seconds for starting selling products',
    "currency": 'EUR',
    'depends': ['point_of_sale', 'bus', 'web'],
    'data': [
        'security/ir.model.access.csv',
        'import/template.xml',
        'data/schedule.xml',
        'view/pos_config.xml',
        'view/pos_call_log.xml',
        'view/pos_cache_database.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],
    'application': True,
    'images': ['static/description/icon.png'],
    'support': 'thanhchatvn@gmail.com',
    "license": "OPL-1",
}
