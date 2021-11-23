fx_version 'cerulean'
game 'gta5'

author 'Axis'
description 'QB-Core'
version '6.0.0'
description 'ax-inventory: TheLostEcho'

shared_scripts {
	'@qb-weapons/config.lua',
	'config.lua',
}

client_scripts {
	"config.lua",
	"client/*",
}

server_scripts {
	"server/main.lua",
}

ui_page {
	'html/ui.html'
}

files {
	'html/ui.html',
	'html/css/main.css',
	'html/js/app.js',
	'html/images/*.png',
	'html/images/*.jpg',
	'html/ammo_images/*.png',
	'html/attachment_images/*.png',
	'html/*.ttf',
	'html/cloth/*.png',
	'html/cloth/*.svg',
	'html/sound.mp3'
}

provide 'qb-inventory'