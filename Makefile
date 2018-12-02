default_target: zip

.PHONY: clean zip

clean:
	rm -f workspace-switcher-popup-thumbnails.zip

zip:
	zip -rq workspace-switcher-popup-thumbnails.zip \
		LICENCE \
		README.md \
		*.js \
		metadata.json \
		stylesheet.css
