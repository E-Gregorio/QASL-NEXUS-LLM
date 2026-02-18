FROM grafana/grafana:latest
USER root
RUN sed -i 's|</body>|<script nonce="[[.Nonce]]" src="http://localhost:3100/widget/ingrid-widget.js"></script>\n</body>|' /usr/share/grafana/public/views/index.html
USER grafana
