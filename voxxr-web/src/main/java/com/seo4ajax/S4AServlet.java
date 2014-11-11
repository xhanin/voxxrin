package com.seo4ajax;

import com.google.appengine.api.urlfetch.HTTPResponse;
import com.google.appengine.api.urlfetch.URLFetchService;
import com.google.appengine.api.urlfetch.URLFetchServiceFactory;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.PropertyResourceBundle;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
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

            URLFetchService urlFetchService = URLFetchServiceFactory.getURLFetchService();
            String urlStr = Constant.API_URL + "/" + siteToken + "/index?" + queryString;
            URL targetUrl = new URL(urlStr);
            HTTPResponse httpResponse = urlFetchService.fetch(targetUrl);

            ServletOutputStream outputStream = response.getOutputStream();
            outputStream.write(httpResponse.getContent());
            outputStream.close();

            if (httpResponse.getResponseCode() == HttpURLConnection.HTTP_OK) {
                // OK
            } else {
                throw new RuntimeException("Error : response code "+httpResponse.getResponseCode() + " || url="+urlStr);
            }
		}
	}
}
