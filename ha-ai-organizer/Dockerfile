ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install Node.js 20 and SQLite
RUN apk add --no-cache nodejs npm sqlite

# Copy application
COPY rootfs /

# Install dependencies
WORKDIR /opt/organizer
COPY rootfs/opt/organizer/package.json .
RUN npm install --production

# Labels
LABEL \
  io.hass.name="HA-AI Home Organizer" \
  io.hass.description="Household management — chores, inventory, maintenance, family tasks" \
  io.hass.type="addon" \
  io.hass.version="0.1.0"

CMD ["/run.sh"]
