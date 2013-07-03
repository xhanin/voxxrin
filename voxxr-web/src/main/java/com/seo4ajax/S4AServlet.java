package com.seo4ajax;

import org.apache.commons.io.IOUtils;

import java.io.IOException;
import java.net.URL;
import java.net.URLConnection;
import java.util.PropertyResourceBundle;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@SuppressWarnings("serial")
public class S4AServlet extends HttpServlet {

	private String siteToken;

	private String mimeType;

	private String indexFileURL;

	public S4AServlet() throws IOException {
		PropertyResourceBundle bundle = new PropertyResourceBundle(getClass()
				.getClassLoader().getResourceAsStream(Constant.CONFIG_FILE));
		siteToken = bundle.getString(Constant.SITE_TOKEN_KEY);
		indexFileURL = bundle.getString(Constant.INDEX_FILE_KEY);
		if (bundle.containsKey(Constant.MIME_TYPE_KEY)) {
			mimeType = bundle.getString(Constant.MIME_TYPE_KEY);
		} else {
			mimeType = Constant.DEFAULT_MIME_TYPE;
		}
	}

	public void doGet(HttpServletRequest request, HttpServletResponse response)
			throws IOException, ServletException {
		String queryString = request.getQueryString();
		response.setContentType(mimeType);
		if (queryString == null
				|| !queryString.startsWith(Constant.ESCAPED_FRAGMENT)) {
			getServletContext().getRequestDispatcher(indexFileURL).forward(
					request, response);
		} else {
			URLConnection urlConnection = new URL(Constant.API_URL + "/"
					+ siteToken + "/?" + queryString).openConnection();
			urlConnection.setConnectTimeout(30 * 1000);
			urlConnection.setReadTimeout(10 * 1000);
			IOUtils.copy(urlConnection.getInputStream(),
                    response.getOutputStream());
		}
	}
}
