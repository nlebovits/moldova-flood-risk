# =========================================================
# Moldova Ag Flood-Risk Map — precompute pipeline orchestration
#
# All steps are idempotent. Re-running `make data` after a
# clean checkout re-fetches missing inputs but skips work
# already cached in `_work/`.
#
# Usage:
#   make data        # full pipeline → ships JSON into ../app/public/data/
#   make info        # print resolved paths and constants
#   make clean       # delete _work/ and shipped JSON (keeps lockfile)
#   make clean-jrc   # delete cached JRC rasters only
# =========================================================

UV := uv run moldova-precompute
WORK := _work
APP_DATA := ../app/public/data

.PHONY: data
data: $(APP_DATA)/field_attrs.json \
      $(APP_DATA)/admin.geojson \
      $(APP_DATA)/summary.json
	@echo "✓ precompute complete"

# ---------------------------------------------------------
# Phase outputs
# ---------------------------------------------------------

$(WORK)/fields.parquet:
	@mkdir -p $(WORK)
	$(UV) extract-fields

$(WORK)/jrc/.fetched:
	@mkdir -p $(WORK)/jrc
	$(UV) fetch-jrc
	@touch $@

$(APP_DATA)/field_attrs.json: $(WORK)/fields.parquet $(WORK)/jrc/.fetched
	@mkdir -p $(APP_DATA)
	$(UV) zonal-stats

$(APP_DATA)/admin.geojson: $(APP_DATA)/field_attrs.json
	@mkdir -p $(APP_DATA)
	$(UV) build-admin

$(APP_DATA)/summary.json: $(APP_DATA)/field_attrs.json
	@mkdir -p $(APP_DATA)
	$(UV) build-summary

# ---------------------------------------------------------
# Utilities
# ---------------------------------------------------------

.PHONY: info
info:
	$(UV) info

.PHONY: clean
clean:
	rm -rf $(WORK)
	rm -f $(APP_DATA)/field_attrs.json
	rm -f $(APP_DATA)/admin.geojson
	rm -f $(APP_DATA)/summary.json

.PHONY: clean-jrc
clean-jrc:
	rm -rf $(WORK)/jrc
